package com.signatureink

import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.RectF
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.AttributeSet
import android.util.Base64
import android.util.TypedValue
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import androidx.core.content.FileProvider
import com.signatureink.ink.Bezier
import com.signatureink.ink.ControlTimedPoints
import com.signatureink.ink.Stroke
import com.signatureink.ink.TimedPoint
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max

/**
 * Single-finger / stylus signature view. Velocity-Bezier ink algorithm
 * (port of warting/gcacace). Renders into an offscreen `inkBitmap` so
 * exports (PNG/JPEG/SVG) and replay are instant.
 */
internal class SignatureCanvasView @JvmOverloads constructor(
  context: Context,
  attrs: AttributeSet? = null,
) : View(context, attrs) {

  // MARK: - Props

  var penColor: Int = Color.parseColor("#111111")
    set(value) { field = value; paint.color = value; rebuildBitmap() }

  // Pen widths are stored in dp (matching iOS points and the JS prop).
  // Every site that hands them to a raw-pixel API (`Paint.strokeWidth`,
  // `Canvas.drawCircle`, `bezier.draw`, SVG `stroke-width`) converts
  // via [dpToPx] at the point of use, so stroke-data round-trips and
  // per-device rendering stay density-independent.
  var penMinWidth: Float = 1f
    set(value) { field = value; lastVelocity = 0f; lastWidth = (penMinWidth + penMaxWidth) / 2f }

  var penMaxWidth: Float = 3f
    set(value) { field = value; lastVelocity = 0f; lastWidth = (penMinWidth + penMaxWidth) / 2f }

  var velocityFilterWeight: Float = 0.7f

  var pencilOnly: Boolean = false

  var inkBackgroundColor: Int = Color.TRANSPARENT
    set(value) { field = value; rebuildBitmap() }

  var showBaseline: Boolean = false
    set(value) { field = value; invalidate() }

  var baselineColor: Int = Color.parseColor("#80808080")
    set(value) { field = value; baselinePaint.color = value }

  var baselineOffsetFromBottom: Float = 16f
    set(value) { field = value; invalidate() }

  /**
   * One of `"solid"`, `"dashed"` (default), `"dotted"`. Anything else
   * resolves to `"dashed"`. Driven by JS through the Fabric prop and
   * applied to [baselinePaint] (and its stroke cap/width) on assign.
   */
  var baselineStyle: String = "dashed"
    set(value) {
      field = value
      applyBaselineStyle()
      invalidate()
    }

  /**
   * Baseline stroke width in dp. `0` (the default) means "use the
   * per-style auto value"; any positive value overrides those defaults
   * regardless of [baselineStyle]. The value is converted to pixels
   * inside [applyBaselineStyle] so a single dp value renders
   * consistently across screen densities.
   */
  var baselineWidth: Float = 0f
    set(value) {
      field = value
      applyBaselineStyle()
      invalidate()
    }

  /**
   * Where to render the baseline relative to the canvas. Driven by
   * [SignatureInkView] when toolbar visibility/position changes so the
   * baseline tracks the toolbar edge instead of jumping to the
   * opposite side.
   *  - [BaselineAnchor.OFFSET_FROM_BOTTOM] — no toolbar; honour
   *    [baselineOffsetFromBottom].
   *  - [BaselineAnchor.BOTTOM_EDGE] — flush against canvas bottom
   *    (toolbar at the bottom).
   *  - [BaselineAnchor.TOP_EDGE] — flush against canvas top
   *    (toolbar at the top).
   */
  var baselineAnchor: BaselineAnchor = BaselineAnchor.OFFSET_FROM_BOTTOM
    set(value) { field = value; invalidate() }

  // MARK: - Callbacks

  var onBegin: (() -> Unit)? = null
  var onEnd: (() -> Unit)? = null
  /** isEmpty, strokeCount */
  var onChange: ((Boolean, Int) -> Unit)? = null
  /** requestId, type, value?, error? */
  var onResult: ((String, String, String?, String?) -> Unit)? = null
  /** progress 0..1 */
  var onReplayProgress: ((Float) -> Unit)? = null

  // MARK: - Internals

  private val paint = Paint().apply {
    isAntiAlias = true
    style = Paint.Style.STROKE
    strokeJoin = Paint.Join.ROUND
    strokeCap = Paint.Cap.ROUND
  }

  private val baselinePaint = Paint().apply {
    isAntiAlias = true
    style = Paint.Style.STROKE
    strokeWidth = 1f
    color = baselineColor
    pathEffect = android.graphics.DashPathEffect(floatArrayOf(8f, 8f), 0f)
  }

  /** Reconfigures [baselinePaint] for the current [baselineStyle]. */
  private fun applyBaselineStyle() {
    // Style-specific auto widths in dp. Overridden by [baselineWidth]
    // when the caller passes a positive value.
    val autoWidthDp: Float = when (baselineStyle.lowercase()) {
      "solid" -> {
        baselinePaint.pathEffect = null
        baselinePaint.strokeCap = Paint.Cap.BUTT
        1f
      }
      "dotted" -> {
        // Near-zero on-segments with ROUND cap render each dash as a
        // circle of diameter ~= strokeWidth, evenly spaced by the gap.
        baselinePaint.pathEffect =
          android.graphics.DashPathEffect(floatArrayOf(0.1f, 6f), 0f)
        baselinePaint.strokeCap = Paint.Cap.ROUND
        // Dotted needs a thicker hairline by default so the round dots
        // remain visible at common densities.
        2f
      }
      else -> { // "dashed" + any unrecognised value
        baselinePaint.pathEffect =
          android.graphics.DashPathEffect(floatArrayOf(8f, 8f), 0f)
        baselinePaint.strokeCap = Paint.Cap.BUTT
        1f
      }
    }
    val widthDp = if (baselineWidth > 0f) baselineWidth else autoWidthDp
    baselinePaint.strokeWidth = TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      widthDp,
      resources.displayMetrics,
    )
  }

  private val bezier = Bezier()

  private val strokes: MutableList<Stroke> = mutableListOf()
  private val undoneStrokes: ArrayDeque<Stroke> = ArrayDeque()

  private var currentStroke: Stroke? = null
  private val activePoints: ArrayDeque<TimedPoint> = ArrayDeque()
  private var lastVelocity: Float = 0f
  // Kept in dp (see [penMinWidth] / [penMaxWidth] doc). Converted to px
  // before being handed to `paint.strokeWidth` or `bezier.draw`.
  private var lastWidth: Float = 2f

  /**
   * dp → raw pixels. The single conversion point so a `penMaxWidth={3}`
   * from JS renders the same physical thickness on 1x/2x/3x devices and
   * matches iOS visually. Android draw APIs (`Paint.strokeWidth`,
   * `Canvas.drawCircle`, SVG coords) all want raw pixels.
   */
  private fun dpToPx(dp: Float): Float = TypedValue.applyDimension(
    TypedValue.COMPLEX_UNIT_DIP,
    dp,
    resources.displayMetrics,
  )

  private var inkBitmap: Bitmap? = null
  private var inkCanvas: Canvas? = null

  // Replay state
  private var replayFrameCallback: Choreographer.FrameCallback? = null
  private var replayStartNanos: Long = 0
  private var replayDurationMs: Long = 0
  private var replaySnapshot: List<Stroke> = emptyList()

  // MARK: - Lifecycle

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    rebuildBitmap()
  }

  private fun rebuildBitmap() {
    if (width <= 0 || height <= 0) return
    inkBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    inkCanvas = Canvas(inkBitmap!!)
    inkCanvas?.drawColor(inkBackgroundColor)
    repaintAllStrokes()
  }

  private fun repaintAllStrokes() {
    val canvas = inkCanvas ?: return
    canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
    canvas.drawColor(inkBackgroundColor)
    val previousColor = paint.color
    for (stroke in strokes) {
      paint.color = stroke.color
      replayStrokeIntoCanvas(stroke, canvas)
    }
    paint.color = previousColor
    invalidate()
  }

  private fun replayStrokeIntoCanvas(stroke: Stroke, canvas: Canvas) {
    val pts = stroke.points
    if (pts.size < 2) {
      if (pts.size == 1) {
        val p = pts[0]
        val r = dpToPx((stroke.minWidth + stroke.maxWidth) / 2f)
        paint.style = Paint.Style.FILL
        canvas.drawCircle(p.x, p.y, r / 2f, paint)
        paint.style = Paint.Style.STROKE
      }
      return
    }

    // Recompute strokes using stored timestamps for visual consistency.
    val savedMinWidth = penMinWidth
    val savedMaxWidth = penMaxWidth
    val savedLastVelocity = lastVelocity
    val savedLastWidth = lastWidth

    // Reset the rolling 4-point buffer; otherwise the first point of this
    // stroke would join the last 3 points of the previous stroke / previous
    // replay frame into a Bezier triple, painting a spurious connector line
    // (e.g. closing a U-shape on replay).
    activePoints.clear()
    penMinWidth = stroke.minWidth
    penMaxWidth = stroke.maxWidth
    lastVelocity = 0f
    lastWidth = (stroke.minWidth + stroke.maxWidth) / 2f

    for (p in pts) {
      addPointToActiveBuffer(p, drawTo = canvas, paintColor = stroke.color)
    }
    flushActiveBuffer(canvas, stroke.color)
    activePoints.clear()

    penMinWidth = savedMinWidth
    penMaxWidth = savedMaxWidth
    lastVelocity = savedLastVelocity
    lastWidth = savedLastWidth
  }

  // MARK: - Drawing

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    if (inkBackgroundColor != Color.TRANSPARENT) {
      canvas.drawColor(inkBackgroundColor)
    }
    inkBitmap?.let { canvas.drawBitmap(it, 0f, 0f, null) }

    if (showBaseline) {
      // `Canvas.drawLine` centers the stroke on `y`, so anchoring at
      // exactly `height - 1` clips the bottom half against the edge.
      // Inset by half-width + sub-pixel guard to render the line full.
      val edgeInset = (baselinePaint.strokeWidth / 2f) + 0.5f
      // JS prop is dp, `View.getHeight()` is raw pixels — convert
      // before subtracting so the offset is density-consistent.
      val offsetPx = TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP,
        baselineOffsetFromBottom,
        resources.displayMetrics,
      )
      val y = when (baselineAnchor) {
        BaselineAnchor.TOP_EDGE -> edgeInset
        BaselineAnchor.BOTTOM_EDGE -> height - edgeInset
        BaselineAnchor.OFFSET_FROM_BOTTOM -> height - offsetPx
      }
      canvas.drawLine(16f, y, width - 16f, y, baselinePaint)
    }
  }

  // MARK: - Touch input

  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (pencilOnly && event.getToolType(0) != MotionEvent.TOOL_TYPE_STYLUS) {
      return false
    }
    cancelReplay()

    val x = event.x
    val y = event.y
    val now = event.eventTime

    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        parent?.requestDisallowInterceptTouchEvent(true)
        beginStroke(x, y, now)
        return true
      }
      MotionEvent.ACTION_MOVE -> {
        addMovePoint(x, y, now)
        return true
      }
      MotionEvent.ACTION_UP,
      MotionEvent.ACTION_CANCEL -> {
        addMovePoint(x, y, now)
        endStroke()
        return true
      }
    }
    return false
  }

  private fun beginStroke(x: Float, y: Float, t: Long) {
    val stroke = Stroke().apply {
      color = penColor
      minWidth = penMinWidth
      maxWidth = penMaxWidth
    }
    currentStroke = stroke
    activePoints.clear()
    lastVelocity = 0f
    lastWidth = (penMinWidth + penMaxWidth) / 2f
    stroke.points.add(TimedPoint(x, y, t))
    activePoints.add(TimedPoint(x, y, t))
    onBegin?.invoke()
    invalidate()
  }

  private fun addMovePoint(x: Float, y: Float, t: Long) {
    val stroke = currentStroke ?: return
    val canvas = inkCanvas ?: return
    val p = TimedPoint(x, y, t)
    if (stroke.points.isNotEmpty()) {
      val last = stroke.points.last()
      if (last.x == x && last.y == y) return
    }
    stroke.points.add(p)
    addPointToActiveBuffer(p, drawTo = canvas, paintColor = stroke.color)
    invalidate()
  }

  private fun endStroke() {
    val stroke = currentStroke ?: return
    val canvas = inkCanvas
    if (canvas != null) {
      if (stroke.points.size == 1) {
        // Single tap with no movement: draw a small filled dot so the
        // stroke is visible (the Bezier path needs >= 4 points).
        val p = stroke.points[0]
        paint.color = stroke.color
        val r = dpToPx((stroke.minWidth + stroke.maxWidth) / 4f)
        val savedStyle = paint.style
        paint.style = Paint.Style.FILL
        canvas.drawCircle(p.x, p.y, r, paint)
        paint.style = savedStyle
      } else {
        flushActiveBuffer(canvas, stroke.color)
      }
    }
    if (stroke.points.isNotEmpty()) {
      strokes.add(stroke)
      undoneStrokes.clear()
      emitChange()
    }
    currentStroke = null
    activePoints.clear()
    onEnd?.invoke()
    invalidate()
  }

  private fun addPointToActiveBuffer(
    point: TimedPoint,
    drawTo: Canvas,
    paintColor: Int,
  ) {
    activePoints.addLast(point)
    if (activePoints.size > 4) activePoints.removeFirst()

    if (activePoints.size == 2) {
      // The rolling Bezier window draws curves p[1]→p[2], so p[0]→p[1]
      // would otherwise never render. Invisible at 60-120Hz live, but
      // produces a visible "jump" during replay — anchor the start
      // with a straight segment here.
      paint.color = paintColor
      val p0 = activePoints[0]
      val p1 = activePoints[1]
      val savedWidth = paint.strokeWidth
      paint.strokeWidth = dpToPx((penMinWidth + penMaxWidth) / 2f)
      drawTo.drawLine(p0.x, p0.y, p1.x, p1.y, paint)
      paint.strokeWidth = savedWidth
    }

    if (activePoints.size == 4) {
      val first = ControlTimedPoints().calculate(
        activePoints[0], activePoints[1], activePoints[2],
      )
      val second = ControlTimedPoints().calculate(
        activePoints[1], activePoints[2], activePoints[3],
      )

      paint.color = paintColor
      val startPoint = activePoints[1]
      val endPoint = activePoints[2]
      val velocity = endPoint.velocityFrom(startPoint)
      val filtered = velocityFilterWeight * velocity +
        (1 - velocityFilterWeight) * lastVelocity
      val newWidth = strokeWidth(filtered)
      bezier.set(startPoint, first.c2, second.c1, endPoint)
      // `bezier.draw` writes its `startWidth`/`endWidth` arguments directly
      // into `paint.strokeWidth`, so they must be in raw pixels.
      bezier.draw(drawTo, paint, dpToPx(lastWidth), dpToPx(newWidth))
      lastVelocity = filtered
      lastWidth = newWidth
    }
  }

  /**
   * Best-effort: when a stroke ends with fewer than 4 buffered points the
   * last point hasn't yet been part of a Bezier triple. Connect the tail
   * with a straight line so the visible ink reaches the user's finger.
   */
  private fun flushActiveBuffer(drawTo: Canvas, paintColor: Int) {
    if (activePoints.size < 2) return
    paint.color = paintColor
    val a = activePoints[activePoints.size - 2]
    val b = activePoints[activePoints.size - 1]
    val savedWidth = paint.strokeWidth
    paint.strokeWidth = dpToPx((penMinWidth + penMaxWidth) / 2f)
    drawTo.drawLine(a.x, a.y, b.x, b.y, paint)
    paint.strokeWidth = savedWidth
  }

  private fun strokeWidth(velocity: Float): Float {
    return max(penMaxWidth / (velocity + 1), penMinWidth)
  }

  // MARK: - Commands

  fun clear() {
    cancelReplay()
    strokes.clear()
    undoneStrokes.clear()
    repaintAllStrokes()
    emitChange()
  }

  fun undo() {
    cancelReplay()
    if (strokes.isEmpty()) return
    undoneStrokes.addLast(strokes.removeAt(strokes.lastIndex))
    repaintAllStrokes()
    emitChange()
  }

  fun redo() {
    cancelReplay()
    if (undoneStrokes.isEmpty()) return
    strokes.add(undoneStrokes.removeLast())
    repaintAllStrokes()
    emitChange()
  }

  fun isEmpty(): Boolean = strokes.isEmpty()

  fun strokeCount(): Int = strokes.size

  /**
   * Writes the signature PNG to cache and puts a `content://` URI clip
   * on the primary clipboard, served by our bundled [FileProvider].
   * `content://` is mandatory on API 24+; a `file://` URI throws
   * [android.os.FileUriExposedException] across processes.
   */
  fun copyToClipboard() {
    val bmp = renderToBitmap(trim = true, opaque = false) ?: return
    val cachePath = File(context.cacheDir, "signature-clipboard.png")
    FileOutputStream(cachePath).use { out ->
      bmp.compress(Bitmap.CompressFormat.PNG, 100, out)
    }
    val authority = "${context.packageName}.signatureinkprovider"
    val uri: Uri = FileProvider.getUriForFile(context.applicationContext, authority, cachePath)
    val clip = ClipData.newUri(context.contentResolver, "signature", uri)
    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    cm.setPrimaryClip(clip)
    // Grant transient read access so the system clipboard preview (Android 13+)
    // can render a thumbnail of the signature.
    context.grantUriPermission(
      "com.android.systemui",
      uri,
      Intent.FLAG_GRANT_READ_URI_PERMISSION
    )
  }

  fun toBase64(format: String, quality: Float, trim: Boolean): String? {
    val opaque = format.equals("jpeg", true) || format.equals("jpg", true)
    val bmp = renderToBitmap(trim = trim, opaque = opaque) ?: return null
    val out = ByteArrayOutputStream()
    val fmt = if (opaque) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
    val q = (quality * 100).toInt().coerceIn(0, 100)
    bmp.compress(fmt, q, out)
    return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  }

  /**
   * Save the rendered signature into `Pictures/Signatures/` via
   * MediaStore. Returns the resulting `content://` URI, or `null` on
   * failure. API 29+ needs no permission (scoped storage); API ≤ 28
   * requires the host app to grant `WRITE_EXTERNAL_STORAGE`.
   */
  fun saveToPhotoLibrary(format: String, quality: Float, trim: Boolean): Uri? {
    val opaque = format.equals("jpeg", true) || format.equals("jpg", true)
    val bmp = renderToBitmap(trim = trim, opaque = opaque) ?: return null
    val mime = if (opaque) "image/jpeg" else "image/png"
    val ext = if (opaque) "jpg" else "png"
    val name = "signature-${System.currentTimeMillis()}.$ext"
    val fmt = if (opaque) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
    val q = (quality * 100).toInt().coerceIn(0, 100)

    val resolver = context.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.Images.Media.DISPLAY_NAME, name)
      put(MediaStore.Images.Media.MIME_TYPE, mime)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        put(
          MediaStore.Images.Media.RELATIVE_PATH,
          "${Environment.DIRECTORY_PICTURES}/Signatures",
        )
        put(MediaStore.Images.Media.IS_PENDING, 1)
      }
    }
    val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
      ?: return null
    return try {
      resolver.openOutputStream(uri)?.use { out ->
        bmp.compress(fmt, q, out)
      } ?: return null
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        values.clear()
        values.put(MediaStore.Images.Media.IS_PENDING, 0)
        resolver.update(uri, values, null, null)
      }
      uri
    } catch (t: Throwable) {
      // Roll back the pending MediaStore entry so we don't leave a
      // placeholder visible in the user's gallery.
      runCatching { resolver.delete(uri, null, null) }
      null
    }
  }

  fun toFile(format: String, quality: Float, trim: Boolean): String? {
    val opaque = format.equals("jpeg", true) || format.equals("jpg", true)
    val bmp = renderToBitmap(trim = trim, opaque = opaque) ?: return null
    val ext = if (opaque) "jpg" else "png"
    val file = File(context.cacheDir, "signature-${System.currentTimeMillis()}.$ext")
    FileOutputStream(file).use { out ->
      val fmt = if (opaque) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
      val q = (quality * 100).toInt().coerceIn(0, 100)
      bmp.compress(fmt, q, out)
    }
    return "file://${file.absolutePath}"
  }

  fun toSvg(): String {
    val bounds = totalBounds()
    val w = max(1f, bounds.width())
    val h = max(1f, bounds.height())
    val sb = StringBuilder()
    sb.append("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"")
    sb.append("%.2f %.2f %.2f %.2f".format(bounds.left, bounds.top, w, h))
    sb.append("\" width=\"${w.toInt()}\" height=\"${h.toInt()}\">")
    for (stroke in strokes) {
      val pts = stroke.points
      if (pts.size < 2) {
        if (pts.size == 1) {
          val p = pts[0]
          // SVG coordinates are in the same space as the point x/y (raw
          // pixels on Android — they come from `MotionEvent.getX/Y`), so
          // the radius derived from the dp pen widths must be converted
          // to pixels too for the dot to render at the intended size.
          sb.append("<circle cx=\"%.2f\" cy=\"%.2f\" r=\"%.2f\" fill=\"%s\"/>"
            .format(p.x, p.y, dpToPx((stroke.minWidth + stroke.maxWidth) / 4f), colorHex(stroke.color)))
        }
        continue
      }
      sb.append("<path d=\"")
      for ((i, p) in pts.withIndex()) {
        if (i == 0) sb.append("M%.2f,%.2f".format(p.x, p.y))
        else sb.append(" L%.2f,%.2f".format(p.x, p.y))
      }
      sb.append("\" stroke=\"${colorHex(stroke.color)}\" stroke-width=\"")
      sb.append("%.2f".format(dpToPx((stroke.minWidth + stroke.maxWidth) / 2f)))
      sb.append("\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>")
    }
    sb.append("</svg>")
    return sb.toString()
  }

  fun getStrokeData(): String {
    val root = JSONArray()
    for (stroke in strokes) {
      val arr = JSONArray()
      for (p in stroke.points) {
        val o = JSONObject()
        o.put("x", p.x.toDouble())
        o.put("y", p.y.toDouble())
        o.put("t", p.timestamp)
        arr.put(o)
      }
      root.put(arr)
    }
    return root.toString()
  }

  fun setStrokeData(json: String) {
    cancelReplay()
    val root = try { JSONArray(json) } catch (_: Throwable) { return }
    strokes.clear()
    undoneStrokes.clear()
    for (i in 0 until root.length()) {
      val pointsArray = root.optJSONArray(i) ?: continue
      val stroke = Stroke().apply {
        color = penColor
        minWidth = penMinWidth
        maxWidth = penMaxWidth
      }
      for (j in 0 until pointsArray.length()) {
        val o = pointsArray.optJSONObject(j) ?: continue
        val x = o.optDouble("x", 0.0).toFloat()
        val y = o.optDouble("y", 0.0).toFloat()
        val t = o.optLong("t", System.currentTimeMillis())
        stroke.points.add(TimedPoint(x, y, t))
      }
      if (stroke.points.isNotEmpty()) strokes.add(stroke)
    }
    repaintAllStrokes()
    emitChange()
  }

  fun replay(speed: Float) {
    if (strokes.isEmpty()) return
    cancelReplay()
    replaySnapshot = strokes.toList()
    val totalPoints = replaySnapshot.sumOf { it.points.size }
    val baseMs = max(500L, totalPoints * 4L)
    replayDurationMs = (baseMs / max(0.05f, speed)).toLong()
    replayStartNanos = System.nanoTime()

    // Hide strokes while replaying.
    strokes.clear()
    repaintAllStrokes()

    val cb = object : Choreographer.FrameCallback {
      override fun doFrame(frameTimeNanos: Long) {
        val elapsedMs = (frameTimeNanos - replayStartNanos) / 1_000_000L
        val progress = (elapsedMs.toFloat() / replayDurationMs).coerceIn(0f, 1f)

        val totalPts = replaySnapshot.sumOf { it.points.size }
        val targetPts = (progress * totalPts).toInt().coerceAtLeast(1)

        var taken = 0
        val partial = mutableListOf<Stroke>()
        for (orig in replaySnapshot) {
          if (taken >= targetPts) break
          val take = (targetPts - taken).coerceAtMost(orig.points.size)
          val s = Stroke().apply {
            color = orig.color
            minWidth = orig.minWidth
            maxWidth = orig.maxWidth
            points.addAll(orig.points.subList(0, take))
          }
          partial.add(s)
          taken += take
        }
        strokes.clear()
        strokes.addAll(partial)
        repaintAllStrokes()
        onReplayProgress?.invoke(progress)

        if (progress >= 1f) {
          strokes.clear()
          strokes.addAll(replaySnapshot)
          repaintAllStrokes()
          replayFrameCallback = null
          return
        }
        Choreographer.getInstance().postFrameCallback(this)
      }
    }
    replayFrameCallback = cb
    Choreographer.getInstance().postFrameCallback(cb)
  }

  private fun cancelReplay() {
    replayFrameCallback?.let { Choreographer.getInstance().removeFrameCallback(it) }
    replayFrameCallback = null
  }

  // MARK: - Lifecycle

  /**
   * Cancels replay on any "removed from view tree" trigger so the
   * singleton Choreographer doesn't keep ticking on a detached view
   * (the frame-callback lambda would hold us alive).
   */
  override fun onDetachedFromWindow() {
    cancelReplay()
    super.onDetachedFromWindow()
  }

  /**
   * Called by the ViewManager's `onDropViewInstance`. Frees the
   * offscreen bitmap and severs JS callbacks so a late event dispatch
   * can't reach a stale React tag.
   */
  fun releaseNativeResources() {
    cancelReplay()
    inkCanvas = null
    inkBitmap?.recycle()
    inkBitmap = null
    strokes.clear()
    undoneStrokes.clear()
    activePoints.clear()
    currentStroke = null
    onBegin = null
    onEnd = null
    onChange = null
    onResult = null
    onReplayProgress = null
  }

  // MARK: - Helpers

  private fun emitChange() {
    onChange?.invoke(strokes.isEmpty(), strokes.size)
  }

  private fun totalBounds(): RectF {
    if (strokes.isEmpty()) return RectF(0f, 0f, width.toFloat(), height.toFloat())
    var l = Float.MAX_VALUE
    var t = Float.MAX_VALUE
    var r = -Float.MAX_VALUE
    var b = -Float.MAX_VALUE
    for (s in strokes) {
      val sb = s.bounds()
      if (sb.left < l) l = sb.left
      if (sb.top < t) t = sb.top
      if (sb.right > r) r = sb.right
      if (sb.bottom > b) b = sb.bottom
    }
    // Pad by ~half stroke-width + an AA margin. `penMaxWidth` is dp;
    // bounds are raw pixels — convert before mixing coord spaces.
    val pad = dpToPx(penMaxWidth * 0.6f) + 2f
    return RectF(l - pad, t - pad, r + pad, b + pad)
  }

  private fun renderToBitmap(trim: Boolean, opaque: Boolean): Bitmap? {
    val src = inkBitmap ?: return null
    val rect: RectF = if (trim && strokes.isNotEmpty()) {
      val b = totalBounds()
      RectF(
        b.left.coerceAtLeast(0f),
        b.top.coerceAtLeast(0f),
        b.right.coerceAtMost(width.toFloat()),
        b.bottom.coerceAtMost(height.toFloat()),
      )
    } else {
      RectF(0f, 0f, width.toFloat(), height.toFloat())
    }
    val w = max(1, rect.width().toInt())
    val h = max(1, rect.height().toInt())
    val out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val c = Canvas(out)
    if (opaque) {
      val bg = if (inkBackgroundColor == Color.TRANSPARENT) Color.WHITE else inkBackgroundColor
      c.drawColor(bg)
    }
    c.drawBitmap(src, -rect.left, -rect.top, null)
    return out
  }

  private fun colorHex(color: Int): String {
    return "#%02X%02X%02X".format(Color.red(color), Color.green(color), Color.blue(color))
  }
}

/**
 * How [SignatureCanvasView] resolves the baseline's vertical position.
 * See [SignatureCanvasView.baselineAnchor] for usage.
 */
internal enum class BaselineAnchor {
  /** Use the explicit `baselineOffsetFromBottom` knob. */
  OFFSET_FROM_BOTTOM,
  /** Pin to the canvas's top edge (toolbar at top). */
  TOP_EDGE,
  /** Pin to the canvas's bottom edge (toolbar at bottom, or symmetric-gap default). */
  BOTTOM_EDGE,
}


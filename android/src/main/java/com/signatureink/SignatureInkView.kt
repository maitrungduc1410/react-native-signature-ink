package com.signatureink

import android.content.Context
import android.graphics.Color
import android.graphics.PorterDuff
import android.graphics.drawable.Drawable
import android.util.AttributeSet
import android.util.TypedValue
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.Menu
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.PopupMenu
import org.json.JSONArray

internal class SignatureInkView @JvmOverloads constructor(
  context: Context,
  attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {

  // MARK: - Public callbacks (wired up by the ViewManager)

  var onBegin: (() -> Unit)? = null
    set(value) { field = value; canvas.onBegin = value }
  var onEnd: (() -> Unit)? = null
    set(value) { field = value; canvas.onEnd = value }
  var onChange: ((Boolean, Int) -> Unit)? = null
    set(value) { field = value; canvas.onChange = value }
  var onResult: ((String, String, String?, String?) -> Unit)? = null
    set(value) { field = value; canvas.onResult = value }
  var onReplayProgress: ((Float) -> Unit)? = null
    set(value) { field = value; canvas.onReplayProgress = value }
  var onToolbarAction: ((String) -> Unit)? = null

  // MARK: - Children

  val canvas: SignatureCanvasView = SignatureCanvasView(context).apply {
    layoutParams = LayoutParams(
      LayoutParams.MATCH_PARENT,
      LayoutParams.MATCH_PARENT,
    )
  }

  private var toolbar: LinearLayout? = null

  // MARK: - Toolbar props

  private var showToolbar: Boolean = false
  private var toolbarPosition: String = "bottom"
  private var toolbarItems: List<ToolbarItemModel> = defaultToolbarItems()
  private var toolbarMaxVisibleButtons: Int = 0
  private var toolbarBackgroundColor: Int = Color.TRANSPARENT
  private var toolbarTintColor: Int? = null
  /** Toolbar height in dp; drives the symmetric vertical icon gap. */
  private var toolbarHeightDp: Float = 48f
  /** Horizontal gap between adjacent toolbar buttons, in dp. */
  private var toolbarIconSpacingDp: Float = 8f

  // Overflow-aware layout cache. The visible / overflow split is computed
  // in `layoutChildrenAt` (where the width is known) and rebuilt only when
  // the items or width change, so there's no render-then-trim flicker.
  private var toolbarRevision: Int = 0
  private var builtToolbarRevision: Int = -1
  private var builtToolbarWidth: Int = -1

  private data class ToolbarItemModel(
    val id: String,
    val icon: String?,
    val text: String?,
    val tintColor: Int?,
    val accessibilityLabel: String,
    val disabled: Boolean,
  )

  private fun invalidateToolbar() {
    toolbarRevision += 1
    // Mirror iOS's `setNeedsLayout`: guarantee a measure/layout pass even
    // when the synchronous `applyChildLayout()` in the calling setter runs
    // before the view has a size (a prop update that lands ahead of Fabric's
    // layout). Our `requestLayout` override posts a real pass for next frame,
    // so a toolbar-only change (e.g. toggling text labels) always rebuilds.
    requestLayout()
  }

  init {
    addView(canvas)
  }

  // MARK: - Setters used by the ViewManager
  //
  // The toolbar's children are rebuilt only on structural changes
  // (button set, visibility toggle). All other props are either read
  // by `layoutChildrenAt` or mutated in place on existing children,
  // and every setter calls `applyChildLayout()` so the change shows
  // synchronously (see the "Layout" section below).

  fun setShowToolbar(value: Boolean) {
    if (showToolbar == value) return
    showToolbar = value
    invalidateToolbar()
    syncBaselineAnchor()
    applyChildLayout()
  }

  fun setToolbarPosition(value: String) {
    val normalized = if (value.equals("top", true)) "top" else "bottom"
    if (toolbarPosition == normalized) return
    toolbarPosition = normalized
    syncBaselineAnchor()
    applyChildLayout()
  }

  fun setToolbarItemsJson(json: String?) {
    toolbarItems = parseToolbarItems(json)
    invalidateToolbar()
    applyChildLayout()
  }

  fun setToolbarMaxVisibleButtons(value: Int) {
    val v = value.coerceAtLeast(0)
    if (toolbarMaxVisibleButtons == v) return
    toolbarMaxVisibleButtons = v
    invalidateToolbar()
    applyChildLayout()
  }

  fun setToolbarBackgroundColor(color: Int) {
    toolbarBackgroundColor = color
    toolbar?.setBackgroundColor(color)
  }

  fun setToolbarTintColor(color: Int?) {
    toolbarTintColor = color
    invalidateToolbar()
    applyChildLayout()
  }

  fun setToolbarHeight(heightDp: Float) {
    val newDp = if (heightDp > 0f) heightDp else 48f
    if (toolbarHeightDp == newDp) return
    toolbarHeightDp = newDp
    applyChildLayout()
  }

  fun setToolbarIconSpacing(spacingDp: Float) {
    val newDp = if (spacingDp >= 0f) spacingDp else 8f
    if (toolbarIconSpacingDp == newDp) return
    toolbarIconSpacingDp = newDp
    invalidateToolbar()
    applyChildLayout()
  }

  // MARK: - Toolbar

  private val builtInIds = setOf("undo", "redo", "clear", "copy")

  private fun defaultToolbarItems(): List<ToolbarItemModel> = listOf(
    ToolbarItemModel("undo", "undo", null, null, "Undo", false),
    ToolbarItemModel("redo", "redo", null, null, "Redo", false),
    ToolbarItemModel("clear", "clear", null, null, "Clear", false),
    ToolbarItemModel("copy", "copy", null, null, "Copy", false),
  )

  private fun parseToolbarItems(json: String?): List<ToolbarItemModel> {
    if (json.isNullOrEmpty()) return defaultToolbarItems()
    return try {
      val arr = JSONArray(json)
      val out = ArrayList<ToolbarItemModel>(arr.length())
      for (i in 0 until arr.length()) {
        val o = arr.optJSONObject(i) ?: continue
        val id = o.optString("id")
        if (id.isEmpty()) continue
        val icon = if (o.isNull("icon")) null else o.optString("icon").ifEmpty { null }
        val text = if (o.isNull("text")) null else o.optString("text").ifEmpty { null }
        val tint = if (o.isNull("tintColor")) null else o.optInt("tintColor")
        val label =
          if (o.isNull("accessibilityLabel")) (text ?: id)
          else o.optString("accessibilityLabel", text ?: id)
        val disabled = o.optBoolean("disabled", false)
        out.add(ToolbarItemModel(id, icon, text, tint, label, disabled))
      }
      if (out.isEmpty()) defaultToolbarItems() else out
    } catch (e: Exception) {
      defaultToolbarItems()
    }
  }

  private fun drawableNameFor(icon: String): String? = when (icon) {
    "undo" -> "arrow_uturn_backward"
    "redo" -> "arrow_uturn_forward"
    "clear" -> "trash"
    "copy" -> "document_on_document"
    "save" -> "square_and_arrow_down"
    "share" -> "square_and_arrow_up"
    "download" -> "arrow_down_circle"
    "check" -> "checkmark"
    else -> null
  }

  private fun drawableResId(name: String): Int =
    context.resources.getIdentifier(name, "drawable", context.packageName)

  private fun drawableFor(icon: String, tint: Int?): Drawable? {
    val resId = drawableNameFor(icon)?.let { drawableResId(it) } ?: 0
    if (resId == 0) return null
    val d = context.getDrawable(resId)?.mutate() ?: return null
    if (tint != null) d.setColorFilter(tint, PorterDuff.Mode.SRC_IN)
    return d
  }

  /**
   * (Re)builds the toolbar's child list for the given width, splitting
   * items into an inline run plus an overflow ("…") menu. Pure-arithmetic
   * capacity (uniform 44dp icon slot + measured width for text) keeps it a
   * single pass with no flicker.
   */
  private fun populateToolbar(widthPx: Int) {
    toolbar?.let { removeView(it) }
    toolbar = null
    if (!showToolbar) return

    val bar = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL or Gravity.END
      setBackgroundColor(toolbarBackgroundColor)
      val pad = dp(8f).toInt()
      setPadding(pad, pad, pad, pad)
      layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
    }

    val spacing = dp(toolbarIconSpacingDp).toInt()
    val slot = dp(44f).toInt()
    val barHeight = dp(toolbarHeightDp).toInt()

    // Build each item and compute the footprint it will actually occupy.
    // Icon-only items are laid out in a fixed `slot`×`slot` box, so their
    // footprint is exactly `slot` — measuring an ImageButton can over-report
    // (default padding / intrinsic drawable size) and trigger a spurious
    // overflow. Text buttons are WRAP_CONTENT, so we measure their real
    // width (the icon is included now that it's an absolute, already-resolved
    // compound drawable).
    val built = toolbarItems.map { item ->
      val v = makeItemView(item)
      val w = if (v is Button) {
        v.measure(
          MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED),
          MeasureSpec.makeMeasureSpec(barHeight, MeasureSpec.AT_MOST),
        )
        v.measuredWidth.coerceAtLeast(slot)
      } else {
        slot
      }
      Pair(v, w)
    }

    val n = built.size
    // Account for the bar's own horizontal padding (8dp each side).
    val available = (widthPx - dp(8f).toInt() * 2).coerceAtLeast(0)

    // Conservative width estimate: each child also carries half-gap margins
    // on both sides, so a child consumes `width + spacing`.
    fun needed(count: Int, withOverflow: Boolean): Int {
      var sum = 0
      for (i in 0 until count) sum += built[i].second + spacing
      if (withOverflow) sum += slot + spacing
      return sum
    }

    var visibleCount = n
    var overflow = false
    val cap = toolbarMaxVisibleButtons
    val capLimited = cap in 1 until n

    if (available > 0) {
      if (!capLimited && needed(n, false) <= available) {
        visibleCount = n
      } else {
        overflow = true
        var k = 0
        while (k < n && needed(k + 1, true) <= available) k++
        if (cap > 0) k = minOf(k, cap)
        visibleCount = k.coerceAtLeast(0)
      }
    } else if (capLimited) {
      overflow = true
      visibleCount = cap
    }

    for (i in 0 until visibleCount) bar.addView(built[i].first)
    if (overflow && visibleCount < n) {
      bar.addView(makeOverflowButton(toolbarItems.subList(visibleCount, n)))
    }

    addView(bar)
    toolbar = bar
  }

  private fun makeItemView(item: ToolbarItemModel): View {
    val tint = item.tintColor ?: toolbarTintColor
    // Built-in items with neither icon nor text fall back to their default
    // icon (which shares the id's name).
    val resolvedIcon =
      item.icon ?: if (item.text == null && builtInIds.contains(item.id)) item.id else null
    val hasText = !item.text.isNullOrEmpty()
    val halfGap = (dp(toolbarIconSpacingDp) / 2f).toInt()
    val size = dp(44f).toInt()

    val view: View = if (hasText) {
      Button(context).apply {
        isAllCaps = false
        transformationMethod = null
        text = item.text
        textSize = 14f
        setBackgroundColor(Color.TRANSPARENT)
        val px = dp(8f).toInt()
        setPadding(px, 0, px, 0)
        minHeight = size
        minimumHeight = size
        // Plain Button carries a theme minWidth (~64-88dp) that would
        // inflate the measured width; drop it so the button hugs content.
        minWidth = 0
        minimumWidth = 0
        if (tint != null) setTextColor(tint)
        if (resolvedIcon != null) {
          val d = drawableFor(resolvedIcon, tint)
          // Absolute (not ...Relative...) on purpose: relative start/end
          // drawables aren't resolved to left/right until the view's layout
          // direction is resolved, so an off-screen measure() would omit the
          // icon width and the overflow capacity math would under-count each
          // text button (→ too many inline → clipped bar). Icon-leading
          // matches iOS. (RTL note: this keeps the icon on the left.)
          setCompoundDrawablesWithIntrinsicBounds(d, null, null, null)
          compoundDrawablePadding = dp(6f).toInt()
        }
        layoutParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.WRAP_CONTENT,
          size,
        ).apply { marginStart = halfGap; marginEnd = halfGap }
      }
    } else {
      ImageButton(context).apply {
        setBackgroundColor(Color.TRANSPARENT)
        resolvedIcon?.let { name ->
          val resId = drawableNameFor(name)?.let { drawableResId(it) } ?: 0
          if (resId != 0) setImageResource(resId)
        }
        scaleType = ImageView.ScaleType.CENTER_INSIDE
        if (tint != null) setColorFilter(tint) else clearColorFilter()
        layoutParams = LinearLayout.LayoutParams(size, size).apply {
          marginStart = halfGap; marginEnd = halfGap
        }
      }
    }

    view.isEnabled = !item.disabled
    view.alpha = if (item.disabled) 0.4f else 1f
    view.contentDescription = item.accessibilityLabel
    view.isClickable = true
    view.isFocusable = true
    view.setOnClickListener { handleToolbarAction(item.id) }
    return view
  }

  private fun makeOverflowButton(items: List<ToolbarItemModel>): View {
    val size = dp(44f).toInt()
    val halfGap = (dp(toolbarIconSpacingDp) / 2f).toInt()
    val snapshot = items.toList()
    return ImageButton(context).apply {
      setBackgroundColor(Color.TRANSPARENT)
      val resId = drawableResId("ellipsis")
      if (resId != 0) setImageResource(resId)
      scaleType = ImageView.ScaleType.CENTER_INSIDE
      toolbarTintColor?.let { setColorFilter(it) }
      contentDescription = "More"
      isClickable = true
      isFocusable = true
      layoutParams = LinearLayout.LayoutParams(size, size).apply {
        marginStart = halfGap; marginEnd = halfGap
      }
      setOnClickListener { anchor ->
        // Wrap the context in our popup ThemeOverlay so the menu renders as a
        // native, rounded, properly-elevated Material popup (and adapts to
        // light / dark) instead of the host theme's bare PopupWindow.
        val themed = ContextThemeWrapper(context, R.style.ThemeOverlay_SignatureInk_PopupMenu)
        val popup = PopupMenu(themed, anchor, Gravity.END)
        snapshot.forEachIndexed { idx, item ->
          val mi = popup.menu.add(Menu.NONE, idx, idx, item.accessibilityLabel)
          mi.isEnabled = !item.disabled
        }
        popup.setOnMenuItemClickListener { mi ->
          snapshot.getOrNull(mi.itemId)?.let { handleToolbarAction(it.id) }
          true
        }
        popup.show()
      }
    }
  }

  private fun handleToolbarAction(id: String) {
    when (id) {
      "undo" -> canvas.undo()
      "redo" -> canvas.redo()
      "clear" -> canvas.clear()
      "copy" -> canvas.copyToClipboard()
    }
    onToolbarAction?.invoke(id)
  }

  private fun dp(v: Float): Float = TypedValue.applyDimension(
    TypedValue.COMPLEX_UNIT_DIP,
    v,
    resources.displayMetrics,
  )

  /**
   * Pushes the appropriate [BaselineAnchor] to the canvas based on the
   * current toolbar visibility + position. Keeps the baseline flush
   * against whichever canvas edge the toolbar is attached to, so
   * toggling `toolbarPosition` makes the baseline track the toolbar
   * instead of jumping to the opposite edge.
   */
  private fun syncBaselineAnchor() {
    canvas.baselineAnchor = when {
      !showToolbar -> BaselineAnchor.OFFSET_FROM_BOTTOM
      toolbarPosition == "top" -> BaselineAnchor.TOP_EDGE
      else -> BaselineAnchor.BOTTOM_EDGE
    }
  }

  // MARK: - Layout
  //
  // Under Fabric, a native child's `requestLayout()` does not by itself
  // trigger a measure/layout pass, so two mechanisms cooperate:
  //   1. Every setter that affects layout calls `applyChildLayout()`,
  //      which measures + positions the children synchronously when the
  //      view already has a size (no flicker, applied this frame).
  //   2. `invalidateToolbar()` additionally calls `requestLayout()`, whose
  //      override below posts a real measure+layout for the next frame.
  //      This is the safety net for the case the synchronous path can't
  //      cover — a prop update that lands while the view's size is still 0
  //      — and is the Android analogue of iOS's `setNeedsLayout`.
  // The `onMeasure` / `onLayout` overrides handle Yoga's initial pass.

  // Re-runs our own measure + layout at the current size. Posted from
  // `requestLayout` because Fabric won't schedule it for us. The width/height
  // guard skips the no-op posts that fire before the first real layout.
  private val measureAndLayout = Runnable {
    if (width > 0 && height > 0) {
      measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
      )
      layout(left, top, right, bottom)
    }
  }

  // `measureAndLayout` can still be null if a superclass constructor calls
  // requestLayout() before this field is initialized; the null check guards
  // that window (hence the suppressed "senseless" comparison warning).
  @Suppress("SENSELESS_COMPARISON")
  override fun requestLayout() {
    super.requestLayout()
    if (measureAndLayout != null) {
      removeCallbacks(measureAndLayout)
      post(measureAndLayout)
    }
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val w = MeasureSpec.getSize(widthMeasureSpec)
    val h = MeasureSpec.getSize(heightMeasureSpec)
    setMeasuredDimension(
      resolveSize(w, widthMeasureSpec),
      resolveSize(h, heightMeasureSpec),
    )

    val outerW = measuredWidth
    val outerH = measuredHeight
    val barHeight = if (showToolbar) dp(toolbarHeightDp).toInt() else 0
    val canvasHeight = (outerH - barHeight).coerceAtLeast(0)

    canvas.measure(
      MeasureSpec.makeMeasureSpec(outerW, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(canvasHeight, MeasureSpec.EXACTLY),
    )
    toolbar?.measure(
      MeasureSpec.makeMeasureSpec(outerW, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(barHeight, MeasureSpec.EXACTLY),
    )
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    layoutChildrenAt(right - left, bottom - top)
  }

  /**
   * Synchronously measures + positions children against the current
   * outer size. No-op when bounds are still zero (initial mount); the
   * Yoga-driven `onMeasure`/`onLayout` pass picks it up later.
   */
  private fun applyChildLayout() {
    if (width <= 0 || height <= 0) return
    layoutChildrenAt(width, height)
    invalidate()
  }

  /**
   * Single source of truth for child measure + layout. Used by both
   * the Yoga-driven `onLayout` override and the synchronous
   * `applyChildLayout` setter path.
   */
  private fun layoutChildrenAt(w: Int, h: Int) {
    // (Re)build the toolbar's visible / overflow split for this width
    // before measuring it, so the first on-screen frame is already correct.
    if (showToolbar) {
      if (toolbar == null ||
        toolbarRevision != builtToolbarRevision ||
        builtToolbarWidth != w
      ) {
        populateToolbar(w)
        builtToolbarRevision = toolbarRevision
        builtToolbarWidth = w
      }
    } else {
      toolbar?.let { removeView(it) }
      toolbar = null
    }

    val barHeight = if (showToolbar) dp(toolbarHeightDp).toInt() else 0
    val canvasH = (h - barHeight).coerceAtLeast(0)
    val canvasTop = if (toolbarPosition == "top") barHeight else 0
    val barTop = if (toolbarPosition == "top") 0 else h - barHeight

    canvas.measure(
      MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(canvasH, MeasureSpec.EXACTLY),
    )
    canvas.layout(0, canvasTop, w, canvasTop + canvasH)

    toolbar?.let { bar ->
      bar.measure(
        MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(barHeight, MeasureSpec.EXACTLY),
      )
      bar.layout(0, barTop, w, barTop + barHeight)
    }
  }
}

package com.signatureink

import android.content.Context
import android.graphics.Color
import android.util.AttributeSet
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout

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
  private var toolbarButtons: List<String> = listOf("undo", "redo", "clear", "copy")
  private var toolbarBackgroundColor: Int = Color.TRANSPARENT
  private var toolbarTintColor: Int? = null
  /** Toolbar height in dp; drives the symmetric vertical icon gap. */
  private var toolbarHeightDp: Float = 48f
  /** Horizontal gap between adjacent toolbar buttons, in dp. */
  private var toolbarIconSpacingDp: Float = 8f

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
    rebuildToolbar()
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

  fun setToolbarButtons(buttons: List<String>) {
    val normalized =
      if (buttons.isEmpty()) listOf("undo", "redo", "clear", "copy") else buttons
    if (toolbarButtons == normalized) return
    toolbarButtons = normalized
    rebuildToolbar()
    applyChildLayout()
  }

  fun setToolbarBackgroundColor(color: Int) {
    toolbarBackgroundColor = color
    toolbar?.setBackgroundColor(color)
  }

  fun setToolbarTintColor(color: Int?) {
    toolbarTintColor = color
    // Re-apply the tint to each ImageButton in place; no need to recreate
    // the whole bar.
    toolbar?.let { bar ->
      for (i in 0 until bar.childCount) {
        val child = bar.getChildAt(i) as? ImageButton ?: continue
        if (color != null) child.setColorFilter(color) else child.clearColorFilter()
      }
    }
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
    toolbar?.let { bar ->
      val halfGap = (dp(toolbarIconSpacingDp) / 2f).toInt()
      for (i in 0 until bar.childCount) {
        val child = bar.getChildAt(i)
        val lp = child.layoutParams as LinearLayout.LayoutParams
        lp.marginStart = halfGap
        lp.marginEnd = halfGap
        child.layoutParams = lp
      }
    }
    applyChildLayout()
  }

  // MARK: - Toolbar

  /**
   * Builds or tears down the toolbar's CHILD list. Doesn't touch the
   * bar's position or size — those are derived dynamically by
   * [layoutChildrenAt] from `toolbarHeightDp` and `toolbarPosition`,
   * so position / height changes never need a rebuild.
   *
   * Callers must follow this with `applyChildLayout()` to push the
   * structural change to screen.
   */
  private fun rebuildToolbar() {
    toolbar?.let { removeView(it) }
    toolbar = null
    if (!showToolbar) return

    val bar = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL or Gravity.END
      setBackgroundColor(toolbarBackgroundColor)
      val pad = dp(8f).toInt()
      setPadding(pad, pad, pad, pad)
      // Dimensions are irrelevant — `layoutChildrenAt` gives the bar
      // explicit bounds — but LinearLayout requires layoutParams to exist.
      layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
    }
    for (action in toolbarButtons) {
      bar.addView(makeButton(action))
    }
    addView(bar)
    toolbar = bar
  }

  private fun makeButton(action: String): View {
    val drawableName = when (action) {
      "undo" -> "arrow_uturn_backward"
      "redo" -> "arrow_uturn_forward"
      "copy" -> "document_on_document"
      "clear" -> "trash"
      else -> null
    }
    val resId = drawableName?.let {
      context.resources.getIdentifier(it, "drawable", context.packageName)
    } ?: 0

    val button = ImageButton(context).apply {
      setBackgroundColor(Color.TRANSPARENT)
      if (resId != 0) setImageResource(resId)
      contentDescription = action
      val size = dp(44f).toInt()
      // Spacing prop is the total gap between adjacent buttons; split it
      // evenly into a half-spacing margin on each side so the cluster
      // stays right-aligned with the toolbar.
      val halfGap = (dp(toolbarIconSpacingDp) / 2f).toInt()
      layoutParams = LinearLayout.LayoutParams(size, size).apply {
        marginStart = halfGap
        marginEnd = halfGap
      }
      scaleType = android.widget.ImageView.ScaleType.CENTER_INSIDE
      toolbarTintColor?.let { setColorFilter(it) }
      isClickable = true
      isFocusable = true
      setOnClickListener {
        when (action) {
          "undo" -> canvas.undo()
          "redo" -> canvas.redo()
          "clear" -> canvas.clear()
          "copy" -> canvas.copyToClipboard()
        }
        onToolbarAction?.invoke(action)
      }
    }
    return button
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
  // Fabric swallows `requestLayout()` from native descendants on
  // Android, and posted measure+layout passes are unreliable (cached
  // specs / cleared flags leave rebuilt toolbars at 0×0). Every setter
  // that affects layout calls `applyChildLayout()`, which measures and
  // positions the children synchronously and unconditionally. The
  // `onMeasure` / `onLayout` overrides below still handle Yoga's
  // initial pass before any setter can fire against a non-zero size.

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

package com.signatureink

import android.graphics.Color
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.facebook.react.viewmanagers.SignatureInkViewManagerDelegate
import com.facebook.react.viewmanagers.SignatureInkViewManagerInterface

@ReactModule(name = SignatureInkViewManager.NAME)
internal class SignatureInkViewManager :
  SimpleViewManager<SignatureInkView>(),
  SignatureInkViewManagerInterface<SignatureInkView> {

  private val mDelegate: ViewManagerDelegate<SignatureInkView> =
    SignatureInkViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<SignatureInkView> = mDelegate

  override fun getName(): String = NAME

  /**
   * React drops a view when the corresponding React component unmounts.
   * The default implementation just removes the View from its parent —
   * but we have a Choreographer callback ticking the replay animation
   * and an offscreen `Bitmap` of the strokes; both have to be released
   * here or they leak past unmount.
   */
  override fun onDropViewInstance(view: SignatureInkView) {
    view.canvas.releaseNativeResources()
    view.onBegin = null
    view.onEnd = null
    view.onChange = null
    view.onResult = null
    view.onReplayProgress = null
    view.onToolbarAction = null
    super.onDropViewInstance(view)
  }

  override fun createViewInstance(context: ThemedReactContext): SignatureInkView {
    val view = SignatureInkView(context)

    view.onBegin = { dispatchSimple(view, EVENT_BEGIN) }
    view.onEnd = { dispatchSimple(view, EVENT_END) }
    view.onChange = { empty, count ->
      val payload = Arguments.createMap().apply {
        putBoolean("isEmpty", empty)
        putInt("strokeCount", count)
      }
      dispatch(view, EVENT_CHANGE, payload)
    }
    view.onResult = { requestId, type, value, error ->
      val payload = Arguments.createMap().apply {
        putString("requestId", requestId)
        putString("type", type)
        if (value != null) putString("value", value) else putNull("value")
        if (error != null) putString("error", error) else putNull("error")
      }
      dispatch(view, EVENT_RESULT, payload)
    }
    view.onReplayProgress = { progress ->
      val payload = Arguments.createMap().apply {
        putDouble("progress", progress.toDouble())
      }
      dispatch(view, EVENT_REPLAY_PROGRESS, payload)
    }
    view.onToolbarAction = { id ->
      val payload = Arguments.createMap().apply {
        putString("itemId", id)
        // Deprecated alias, kept for one release.
        putString("action", id)
      }
      dispatch(view, EVENT_TOOLBAR_ACTION, payload)
    }

    return view
  }

  // MARK: - Props

  @ReactProp(name = "penColor")
  override fun setPenColor(view: SignatureInkView?, value: Int?) {
    view?.canvas?.penColor = value ?: Color.parseColor("#111111")
  }

  @ReactProp(name = "penMinWidth")
  override fun setPenMinWidth(view: SignatureInkView?, value: Float) {
    // Defaults intentionally match the iOS side (1 / 3) so JS can omit
    // these props and get the same visual on both platforms. The value
    // is interpreted as dp inside SignatureCanvasView.
    view?.canvas?.penMinWidth = if (value > 0f) value else 1f
  }

  @ReactProp(name = "penMaxWidth")
  override fun setPenMaxWidth(view: SignatureInkView?, value: Float) {
    view?.canvas?.penMaxWidth = if (value > 0f) value else 3f
  }

  @ReactProp(name = "velocityFilterWeight")
  override fun setVelocityFilterWeight(view: SignatureInkView?, value: Float) {
    view?.canvas?.velocityFilterWeight = value.coerceIn(0f, 1f)
  }

  @ReactProp(name = "inkBackgroundColor")
  override fun setInkBackgroundColor(view: SignatureInkView?, value: Int?) {
    view?.canvas?.inkBackgroundColor = value ?: Color.TRANSPARENT
  }

  @ReactProp(name = "showBaseline")
  override fun setShowBaseline(view: SignatureInkView?, value: Boolean) {
    view?.canvas?.showBaseline = value
  }

  @ReactProp(name = "baselineColor")
  override fun setBaselineColor(view: SignatureInkView?, value: Int?) {
    view?.canvas?.baselineColor = value ?: Color.parseColor("#80808080")
  }

  @ReactProp(name = "baselineStyle")
  override fun setBaselineStyle(view: SignatureInkView?, value: String?) {
    view?.canvas?.baselineStyle = value ?: "dashed"
  }

  @ReactProp(name = "baselineWidth")
  override fun setBaselineWidth(view: SignatureInkView?, value: Float) {
    // Negative values are normalised to 0 (the "auto / per-style
    // default" sentinel); positive values pass through verbatim and
    // are dp-converted inside the canvas view.
    view?.canvas?.baselineWidth = if (value > 0f) value else 0f
  }

  @ReactProp(name = "baselineOffsetFromBottom")
  override fun setBaselineOffsetFromBottom(view: SignatureInkView?, value: Float) {
    view?.canvas?.baselineOffsetFromBottom = if (value > 0f) value else 16f
  }

  @ReactProp(name = "pencilOnly")
  override fun setPencilOnly(view: SignatureInkView?, value: Boolean) {
    view?.canvas?.pencilOnly = value
  }

  @ReactProp(name = "showToolbar")
  override fun setShowToolbar(view: SignatureInkView?, value: Boolean) {
    view?.setShowToolbar(value)
  }

  @ReactProp(name = "toolbarPosition")
  override fun setToolbarPosition(view: SignatureInkView?, value: String?) {
    view?.setToolbarPosition(value ?: "bottom")
  }

  @ReactProp(name = "toolbarItemsJson")
  override fun setToolbarItemsJson(view: SignatureInkView?, value: String?) {
    view?.setToolbarItemsJson(value)
  }

  @ReactProp(name = "toolbarMaxVisibleButtons")
  override fun setToolbarMaxVisibleButtons(view: SignatureInkView?, value: Int) {
    view?.setToolbarMaxVisibleButtons(value)
  }

  @ReactProp(name = "toolbarBackgroundColor")
  override fun setToolbarBackgroundColor(view: SignatureInkView?, value: Int?) {
    view?.setToolbarBackgroundColor(value ?: Color.TRANSPARENT)
  }

  @ReactProp(name = "toolbarTintColor")
  override fun setToolbarTintColor(view: SignatureInkView?, value: Int?) {
    view?.setToolbarTintColor(value)
  }

  @ReactProp(name = "toolbarHeight")
  override fun setToolbarHeight(view: SignatureInkView?, value: Float) {
    view?.setToolbarHeight(value)
  }

  @ReactProp(name = "toolbarIconSpacing")
  override fun setToolbarIconSpacing(view: SignatureInkView?, value: Float) {
    view?.setToolbarIconSpacing(value)
  }

  @ReactProp(name = "showToolPicker")
  override fun setShowToolPicker(view: SignatureInkView?, value: Boolean) {
    // iOS-only feature; intentionally a no-op on Android.
  }

  @ReactProp(name = "defaultInkType")
  override fun setDefaultInkType(view: SignatureInkView?, value: String?) {
    // iOS-only; Android always renders a single pen ink.
  }

  // MARK: - Commands

  override fun receiveCommand(
    view: SignatureInkView,
    commandId: String?,
    args: ReadableArray?,
  ) {
    when (commandId) {
      "clear" -> view.canvas.clear()
      "undo" -> view.canvas.undo()
      "redo" -> view.canvas.redo()
      "copyToClipboard" -> view.canvas.copyToClipboard()
      "isEmpty" -> {
        val rid = args?.getString(0).orEmpty()
        view.canvas.onResult?.invoke(
          rid,
          "isEmpty",
          if (view.canvas.isEmpty()) "true" else "false",
          null,
        )
      }
      "toBase64" -> {
        val rid = args?.getString(0).orEmpty()
        val format = args?.getString(1) ?: "png"
        val quality = args?.getDouble(2)?.toFloat() ?: 1f
        val trim = args?.getBoolean(3) ?: false
        try {
          val result = view.canvas.toBase64(format, quality, trim)
          if (result != null) {
            view.canvas.onResult?.invoke(rid, "toBase64", result, null)
          } else {
            view.canvas.onResult?.invoke(rid, "toBase64", null, "Failed to render bitmap")
          }
        } catch (t: Throwable) {
          view.canvas.onResult?.invoke(rid, "toBase64", null, t.message ?: "error")
        }
      }
      "toFile" -> {
        val rid = args?.getString(0).orEmpty()
        val format = args?.getString(1) ?: "png"
        val quality = args?.getDouble(2)?.toFloat() ?: 1f
        val trim = args?.getBoolean(3) ?: false
        try {
          val result = view.canvas.toFile(format, quality, trim)
          if (result != null) {
            view.canvas.onResult?.invoke(rid, "toFile", result, null)
          } else {
            view.canvas.onResult?.invoke(rid, "toFile", null, "Failed to render bitmap")
          }
        } catch (t: Throwable) {
          view.canvas.onResult?.invoke(rid, "toFile", null, t.message ?: "error")
        }
      }
      "toSvg" -> {
        val rid = args?.getString(0).orEmpty()
        view.canvas.onResult?.invoke(rid, "toSvg", view.canvas.toSvg(), null)
      }
      "getStrokeData" -> {
        val rid = args?.getString(0).orEmpty()
        view.canvas.onResult?.invoke(rid, "getStrokeData", view.canvas.getStrokeData(), null)
      }
      "setStrokeData" -> {
        val json = args?.getString(0) ?: "[]"
        view.canvas.setStrokeData(json)
      }
      "replay" -> {
        val speed = args?.getDouble(0)?.toFloat() ?: 1f
        view.canvas.replay(speed)
      }
      "saveToPhotoLibrary" -> {
        val rid = args?.getString(0).orEmpty()
        val format = args?.getString(1) ?: "png"
        val quality = args?.getDouble(2)?.toFloat() ?: 1f
        val trim = args?.getBoolean(3) ?: true
        dispatchSaveToPhotoLibrary(view, rid, format, quality, trim)
      }
    }
  }

  private fun dispatchSaveToPhotoLibrary(
    view: SignatureInkView,
    requestId: String,
    format: String,
    quality: Float,
    trim: Boolean,
  ) {
    try {
      val uri = view.canvas.saveToPhotoLibrary(format, quality, trim)
      val payload = if (uri != null) {
        """{"granted":true,"uri":"${uri}"}"""
      } else {
        """{"granted":false}"""
      }
      view.canvas.onResult?.invoke(requestId, "saveToPhotoLibrary", payload, null)
    } catch (t: Throwable) {
      view.canvas.onResult?.invoke(
        requestId,
        "saveToPhotoLibrary",
        null,
        t.message ?: "saveToPhotoLibrary failed",
      )
    }
  }

  // MARK: - Codegen interface no-op overloads
  //
  // The codegen interface declares overloads for each command. We dispatch all
  // commands through receiveCommand above for one consistent code path.

  override fun clear(view: SignatureInkView?) {
    view?.canvas?.clear()
  }
  override fun undo(view: SignatureInkView?) {
    view?.canvas?.undo()
  }
  override fun redo(view: SignatureInkView?) {
    view?.canvas?.redo()
  }
  override fun copyToClipboard(view: SignatureInkView?) {
    view?.canvas?.copyToClipboard()
  }
  override fun isEmpty(view: SignatureInkView?, requestId: String?) {
    view ?: return
    view.canvas.onResult?.invoke(
      requestId.orEmpty(),
      "isEmpty",
      if (view.canvas.isEmpty()) "true" else "false",
      null,
    )
  }
  override fun toBase64(
    view: SignatureInkView?,
    requestId: String?,
    format: String?,
    quality: Float,
    trim: Boolean,
  ) {
    view ?: return
    val rid = requestId.orEmpty()
    try {
      val r = view.canvas.toBase64(format ?: "png", quality, trim)
      view.canvas.onResult?.invoke(rid, "toBase64", r, if (r == null) "render failed" else null)
    } catch (t: Throwable) {
      view.canvas.onResult?.invoke(rid, "toBase64", null, t.message ?: "error")
    }
  }
  override fun toFile(
    view: SignatureInkView?,
    requestId: String?,
    format: String?,
    quality: Float,
    trim: Boolean,
  ) {
    view ?: return
    val rid = requestId.orEmpty()
    try {
      val r = view.canvas.toFile(format ?: "png", quality, trim)
      view.canvas.onResult?.invoke(rid, "toFile", r, if (r == null) "render failed" else null)
    } catch (t: Throwable) {
      view.canvas.onResult?.invoke(rid, "toFile", null, t.message ?: "error")
    }
  }
  override fun toSvg(view: SignatureInkView?, requestId: String?) {
    view ?: return
    view.canvas.onResult?.invoke(requestId.orEmpty(), "toSvg", view.canvas.toSvg(), null)
  }
  override fun getStrokeData(view: SignatureInkView?, requestId: String?) {
    view ?: return
    view.canvas.onResult?.invoke(
      requestId.orEmpty(),
      "getStrokeData",
      view.canvas.getStrokeData(),
      null,
    )
  }
  override fun setStrokeData(view: SignatureInkView?, json: String?) {
    view?.canvas?.setStrokeData(json ?: "[]")
  }
  override fun replay(view: SignatureInkView?, speed: Float) {
    view?.canvas?.replay(speed)
  }
  override fun saveToPhotoLibrary(
    view: SignatureInkView?,
    requestId: String?,
    format: String?,
    quality: Float,
    trim: Boolean,
  ) {
    view ?: return
    dispatchSaveToPhotoLibrary(
      view,
      requestId.orEmpty(),
      format ?: "png",
      quality,
      trim,
    )
  }

  // MARK: - Event dispatch

  private fun dispatchSimple(view: SignatureInkView, name: String) {
    dispatch(view, name, null)
  }

  private fun dispatch(view: SignatureInkView, name: String, data: WritableMap?) {
    val ctx = view.context as? ThemedReactContext ?: return
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(ctx, view.id) ?: return
    dispatcher.dispatchEvent(
      SignatureInkEvent(
        surfaceId = UIManagerHelper.getSurfaceId(ctx),
        viewTag = view.id,
        name = name,
        payload = data,
      ),
    )
  }

  private class SignatureInkEvent(
    surfaceId: Int,
    viewTag: Int,
    private val name: String,
    private val payload: WritableMap?,
  ) : Event<SignatureInkEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = name
    override fun getEventData(): WritableMap? = payload
  }

  companion object {
    const val NAME = "SignatureInkView"

    // Use the `top`-prefixed registration names. NOTE: `topChange` is
    // already claimed by RN core (bubbling) for TextInput/Switch, so we use
    // `topStrokesChange` (codegen-derived from `onStrokesChange`) instead.
    private const val EVENT_BEGIN = "topBegin"
    private const val EVENT_END = "topEnd"
    private const val EVENT_CHANGE = "topStrokesChange"
    private const val EVENT_RESULT = "topResult"
    private const val EVENT_REPLAY_PROGRESS = "topReplayProgress"
    private const val EVENT_TOOLBAR_ACTION = "topToolbarAction"
  }
}

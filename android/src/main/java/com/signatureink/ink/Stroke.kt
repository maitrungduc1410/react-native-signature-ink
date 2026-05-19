package com.signatureink.ink

import android.graphics.RectF

/** A single completed stroke captured from a touch-down/up gesture. */
internal class Stroke {
  val points: MutableList<TimedPoint> = mutableListOf()
  var color: Int = 0xFF111111.toInt()
  var minWidth: Float = 1f
  var maxWidth: Float = 3f

  fun bounds(): RectF {
    if (points.isEmpty()) return RectF()
    var l = points[0].x
    var t = points[0].y
    var r = l
    var b = t
    for (p in points) {
      if (p.x < l) l = p.x
      if (p.y < t) t = p.y
      if (p.x > r) r = p.x
      if (p.y > b) b = p.y
    }
    return RectF(l, t, r, b)
  }
}

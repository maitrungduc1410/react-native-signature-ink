package com.signatureink.ink

import kotlin.math.hypot

/**
 * A single sampled (x, y, t) tuple. The timestamp is consumed by the
 * velocity-Bezier smoother to taper stroke width with pen speed.
 */
internal class TimedPoint(
  var x: Float,
  var y: Float,
  var timestamp: Long = System.currentTimeMillis(),
) {
  fun set(x: Float, y: Float, t: Long = System.currentTimeMillis()): TimedPoint {
    this.x = x
    this.y = y
    this.timestamp = t
    return this
  }

  fun distanceTo(other: TimedPoint): Float =
    hypot((other.x - x).toDouble(), (other.y - y).toDouble()).toFloat()

  fun velocityFrom(start: TimedPoint): Float {
    val dt = (timestamp - start.timestamp).coerceAtLeast(1L)
    val d = distanceTo(start)
    val v = d / dt
    return if (v.isNaN() || v.isInfinite()) 0f else v
  }
}

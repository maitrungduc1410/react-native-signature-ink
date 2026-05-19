package com.signatureink.ink

import android.graphics.Canvas
import android.graphics.Paint
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.sqrt

/**
 * A cubic Bezier curve segment between two anchor points with two control
 * points. Drawn as a series of short straight-line subsegments whose count
 * scales with the on-screen length, so width transitions stay smooth even
 * for fast pen strokes.
 */
internal class Bezier {
  var startPoint: TimedPoint = TimedPoint(0f, 0f)
  var endPoint: TimedPoint = TimedPoint(0f, 0f)
  var control1: TimedPoint = TimedPoint(0f, 0f)
  var control2: TimedPoint = TimedPoint(0f, 0f)

  fun set(
    start: TimedPoint,
    c1: TimedPoint,
    c2: TimedPoint,
    end: TimedPoint,
  ): Bezier {
    startPoint = start
    control1 = c1
    control2 = c2
    endPoint = end
    return this
  }

  /**
   * Estimate the on-screen length of the segment so we can pick a step count
   * that's both smooth and cheap. Uses the chord-plus-control-net heuristic
   * from the gcacace implementation.
   */
  fun length(): Float {
    val steps = 10
    var length = 0f
    var prevX = startPoint.x
    var prevY = startPoint.y
    for (i in 1..steps) {
      val t = i.toFloat() / steps
      val x = point(t, startPoint.x, control1.x, control2.x, endPoint.x)
      val y = point(t, startPoint.y, control1.y, control2.y, endPoint.y)
      val dx = x - prevX
      val dy = y - prevY
      length += sqrt((dx * dx + dy * dy).toDouble()).toFloat()
      prevX = x
      prevY = y
    }
    return length
  }

  fun draw(canvas: Canvas, paint: Paint, startWidth: Float, endWidth: Float) {
    val originalWidth = paint.strokeWidth
    val widthDelta = endWidth - startWidth
    val drawSteps = max(1, ceil(length().toDouble()).toInt())
    var prevX = startPoint.x
    var prevY = startPoint.y
    for (i in 0..drawSteps) {
      val t = i.toFloat() / drawSteps
      val x = point(t, startPoint.x, control1.x, control2.x, endPoint.x)
      val y = point(t, startPoint.y, control1.y, control2.y, endPoint.y)
      paint.strokeWidth = startWidth + widthDelta * t
      canvas.drawLine(prevX, prevY, x, y, paint)
      prevX = x
      prevY = y
    }
    paint.strokeWidth = originalWidth
  }

  private fun point(t: Float, p0: Float, p1: Float, p2: Float, p3: Float): Float {
    val one = 1f - t
    return one * one * one * p0 +
      3f * one * one * t * p1 +
      3f * one * t * t * p2 +
      t * t * t * p3
  }
}

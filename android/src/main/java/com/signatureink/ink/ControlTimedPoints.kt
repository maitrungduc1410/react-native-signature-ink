package com.signatureink.ink

/** Two control points used to draw a quadratic Bezier between three samples. */
internal class ControlTimedPoints {
  var c1: TimedPoint = TimedPoint(0f, 0f)
  var c2: TimedPoint = TimedPoint(0f, 0f)

  /**
   * Compute the two control points that define the curve approximation
   * between `s2` and `s3` given three consecutive samples (`s1`, `s2`, `s3`).
   *
   * Algorithm from gcacace/android-signaturepad, which itself is the classic
   * "Smoother Signatures" approach (Square engineering blog, 2012).
   */
  fun calculate(s1: TimedPoint, s2: TimedPoint, s3: TimedPoint): ControlTimedPoints {
    val dx1 = s1.x - s2.x
    val dy1 = s1.y - s2.y
    val dx2 = s2.x - s3.x
    val dy2 = s2.y - s3.y

    val m1x = (s1.x + s2.x) / 2f
    val m1y = (s1.y + s2.y) / 2f
    val m2x = (s2.x + s3.x) / 2f
    val m2y = (s2.y + s3.y) / 2f

    val l1 = Math.sqrt((dx1 * dx1 + dy1 * dy1).toDouble()).toFloat()
    val l2 = Math.sqrt((dx2 * dx2 + dy2 * dy2).toDouble()).toFloat()

    val dxm = m1x - m2x
    val dym = m1y - m2y
    val k = if ((l2 + l1) == 0f) 0f else l2 / (l1 + l2)
    val cmx = m2x + dxm * k
    val cmy = m2y + dym * k

    val tx = s2.x - cmx
    val ty = s2.y - cmy

    c1.set(m1x + tx, m1y + ty)
    c2.set(m2x + tx, m2y + ty)
    return this
  }
}

module.exports = (function () {
  function polygonClip(subjectPolygon, clipPolygon) {
    var cp1,
      cp2,
      s,
      e,
      outputList = subjectPolygon;
    cp1 = clipPolygon[clipPolygon.length - 2];
    for (var j = 0, jlen = clipPolygon.length - 1; j < jlen; j++) {
      cp2 = clipPolygon[j];
      var inputList = outputList;
      outputList = [];
      s = inputList[inputList.length - 1];
      for (var i = 0, len = inputList.length; i < len; i++) {
        e = inputList[i];
        if (clipInside(e, cp1, cp2)) {
          clipInside(s, cp1, cp2) ||
          outputList.push(clipIntersection(cp1, cp2, s, e));
          outputList.push(e);
        } else
          clipInside(s, cp1, cp2) &&
          outputList.push(clipIntersection(cp1, cp2, s, e));
        s = e;
      }
      cp1 = cp2;
    }
    if (outputList.length < 3) return [];
    outputList.push(outputList[0]);
    return outputList;
  }
  function pointOnSegment(p, p1, p2) {
    var tx = ((p2[1] - p1[1]) / (p2[0] - p1[0])) * (p[0] - p1[0]) + p1[1];
    return Math.abs(tx - p[1]) < 1e-6 && p[0] >= p1[0] && p[0] <= p2[0];
  }
  function pointOnPolygon(point, vs) {
    for (var i = 0, len = vs.length; i < len - 1; i++)
      if (pointOnSegment(point, vs[i], vs[i + 1])) return !0;
    return !1;
  }
  function pointInPolygon(point, vs) {
    for (
      var x = point[0],
        y = point[1],
        inside = !1,
        i = 0,
        len = vs.length,
        j = len - 1;
      i < len;
      j = i++
    ) {
      var xi = vs[i][0],
        yi = vs[i][1],
        xj = vs[j][0],
        yj = vs[j][1],
        intersect =
          yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      intersect && (inside = !inside);
    }
    return inside;
  }
  function getClosestPointOnSegment(p, p1, p2) {
    var t,
      x = p1[0],
      y = p1[1],
      dx = p2[0] - x,
      dy = p2[1] - y,
      dot = dx * dx + dy * dy;
    if (dot > 0) {
      t = ((p[0] - x) * dx + (p[1] - y) * dy) / dot;
      if (t > 1) {
        x = p2[0];
        y = p2[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    return [x, y];
  }
  function sqClosestDistanceToSegment(p, p1, p2) {
    var p3 = getClosestPointOnSegment(p, p1, p2),
      dx = p[0] - p3[0],
      dy = p[1] - p3[1];
    return dx * dx + dy * dy;
  }
  function sqClosestDistanceToPolygon(p, points) {
    for (
      var minSq = Number.MAX_VALUE, i = 0, len = points.length;
      i < len - 1;
      i++
    ) {
      var sq = sqClosestDistanceToSegment(p, points[i], points[i + 1]);
      sq < minSq && (minSq = sq);
    }
    return minSq;
  }
  var clipInside = function (p, cp1, cp2) {
      return (
        (cp2[0] - cp1[0]) * (p[1] - cp1[1]) >
        (cp2[1] - cp1[1]) * (p[0] - cp1[0])
      );
    },
    clipIntersection = function (cp1, cp2, s, e) {
      var dc = [cp1[0] - cp2[0], cp1[1] - cp2[1]],
        dp = [s[0] - e[0], s[1] - e[1]],
        n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0],
        n2 = s[0] * e[1] - s[1] * e[0],
        n3 = 1 / (dc[0] * dp[1] - dc[1] * dp[0]);
      return [(n1 * dp[0] - n2 * dc[0]) * n3, (n1 * dp[1] - n2 * dc[1]) * n3];
    };
  return {
    sqClosestDistanceToPolygon: sqClosestDistanceToPolygon,
    sqClosestDistanceToSegment: sqClosestDistanceToSegment,
    pointOnSegment: pointOnSegment,
    pointOnPolygon: pointOnPolygon,
    pointInPolygon: pointInPolygon,
    polygonClip: polygonClip,
  };
})();


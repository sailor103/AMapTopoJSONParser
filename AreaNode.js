const Const = require('./Const')
const SphericalMercator = require('./SphericalMercator')
const geomUtils = require('./geomUtils')
const bbIdxBuilder = require('./bbIdxBuilder')
const utils = require('./utils')

module.exports = (
  function (utils, SphericalMercator, Const, geomUtils, bbIdxBuilder) {
    function AreaNode(adcode, data, opts) {
      this.adcode = adcode;
      this._data = data;
      this._sqScaleFactor = data.scale * data.scale;
      this._opts = utils.extend(
        {
          nearTolerance: 2,
        },
        opts
      );
      this.setNearTolerance(this._opts.nearTolerance);
    }
    var staticMethods = {
      getPropsOfFeature: function (f) {
        return f && f.properties ? f.properties : null;
      },
      getAdcodeOfFeature: function (f) {
        return f ? f.properties.adcode : null;
      },
      doesFeatureHasChildren: function (f) {
        return !!f && f.properties.childrenNum > 0;
      },
    };
    utils.extend(AreaNode, staticMethods);
    utils.extend(AreaNode.prototype, staticMethods, {
      setNearTolerance: function (t) {
        this._opts.nearTolerance = t;
        this._sqNearTolerance = t * t;
      },
      getIdealZoom: function () {
        return this._data.idealZoom;
      },
      _getEmptySubFeatureGroupItem: function (idx) {
        return {
          subFeatureIndex: idx,
          subFeature: this.getSubFeatureByIndex(idx),
          pointsIndexes: [],
          points: [],
        };
      },
      groupByPosition: function (points, getPosition) {
        var i,
          len,
          groupMap = {},
          outsideItem = null;
        for (i = 0, len = points.length; i < len; i++) {
          var idx = this.getLocatedSubFeatureIndex(
            getPosition.call(null, points[i], i)
          );
          groupMap[idx] ||
          (groupMap[idx] = this._getEmptySubFeatureGroupItem(idx));
          groupMap[idx].pointsIndexes.push(i);
          groupMap[idx].points.push(points[i]);
          idx < 0 && (outsideItem = groupMap[idx]);
        }
        var groupList = [];
        if (this._data.geoData.sub)
          for (
            i = 0, len = this._data.geoData.sub.features.length;
            i < len;
            i++
          )
            groupList.push(groupMap[i] || this._getEmptySubFeatureGroupItem(i));
        outsideItem && groupList.push(outsideItem);
        groupMap = null;
        return groupList;
      },
      getLocatedSubFeature: function (lngLat) {
        var fIdx = this.getLocatedSubFeatureIndex(lngLat);
        return this.getSubFeatureByIndex(fIdx);
      },
      getLocatedFeature: function (lngLat) {
        var f = this.getLocatedSubFeature(lngLat);
        f ||
        this._data.geoData.sub ||
        !this.underPositoin(lngLat) ||
        (f = this._data.geoData.parent);
        return f;
      },
      underPositoin: function (lngLat) {
        var p20 = SphericalMercator.lngLatToPoint(
            [lngLat.lng, lngLat.lat],
            20,
            !0
          ),
          geo = this._data.geoData.parent.geometry;
        if ("MultiPolygon" === geo.type) {
          for (var i = 0, len = geo.coordinates.length; i < len; i += 1)
            if (this.containsCoordinate(p20, geo.coordinates[i][0], 1))
              return !0;
          return !1;
        }
        if ("Polygon" === geo.type)
          return this.containsCoordinate(p20, geo.coordinates[0], 1);
      },
      containsCoordinate: function (coordinate, vertices, containBounds) {
        for (
          var xi,
            yi,
            xj,
            yj,
            x = coordinate[0],
            y = coordinate[1],
            inside = !1,
            numVertices = vertices.length,
            i = 0,
            j = numVertices - 1;
          i < numVertices;
          j = i, i += 1
        ) {
          var intersect = !1;
          xi = vertices[i][0];
          yi = vertices[i][1];
          xj = vertices[j][0];
          yj = vertices[j][1];
          if ((xi === x && yi === y) || (xj === x && yj === y))
            return !!containBounds;
          if (yi < y == yj >= y) {
            var xx = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (x === xx) return !!containBounds;
            intersect = x < xx;
          }
          intersect && (inside = !inside);
        }
        return inside;
      },
      getLocatedSubFeatureIndex: function (lngLat) {
        return this._getLocatedSubFeatureIndexByPixel(
          this.lngLatToPixel(lngLat, this._data.pz)
        );
      },
      getSubFeatureByIndex: function (fIdx) {
        if (fIdx >= 0) {
          var features = this.getSubFeatures();
          return features[fIdx];
        }
        return null;
      },
      getSubFeatureByAdcode: function (adcode) {
        adcode = parseInt(adcode, 10);
        for (
          var features = this.getSubFeatures(), i = 0, len = features.length;
          i < len;
          i++
        )
          if (this.getAdcodeOfFeature(features[i]) === adcode)
            return features[i];
        return null;
      },
      _getLocatedSubFeatureIndexByPixel: function (pixel) {
        if (!this._data.geoData.sub) return -1;
        var data = this._data,
          bbIdx = data.bbIndex,
          offX = pixel[0] - bbIdx.l,
          offY = pixel[1] - bbIdx.t,
          y = Math.floor(offY / bbIdx.s),
          x = Math.floor(offX / bbIdx.s);
        if (x < 0 || y < 0 || y >= bbIdx.h || x >= bbIdx.w) return -1;
        var seqIdx = y * bbIdx.w + x,
          idxItem = bbIdx.idxList[seqIdx];
        if (!idxItem) return -1;
        var BBRFLAG = Const.BBRFLAG;
        switch (idxItem[0]) {
          case BBRFLAG.I:
            return idxItem[1];

          case BBRFLAG.S:
            bbIdxBuilder.prepareGridFeatureClip(data, x, y, idxItem[1]);
            return this._calcLocatedFeatureIndexOfSList(pixel, idxItem[1]);

          default:
            throw new Error("Unknown BBRFLAG: " + idxItem[0]);
        }
      },
      _calcNearestFeatureIndexOfSList: function (pixel, list) {
        var features = [];
        this._data.geoData.sub && (features = this._data.geoData.sub.features);
        for (
          var closest = {
              sq: Number.MAX_VALUE,
              idx: -1,
            },
            i = 0,
            len = list.length;
          i < len;
          i++
        ) {
          var idxItem = list[i],
            feature = features[idxItem[0]],
            ring = idxItem[2] || feature.geometry.coordinates[idxItem[1]][0],
            sqDistance = geomUtils.sqClosestDistanceToPolygon(pixel, ring);
          if (sqDistance < closest.sq) {
            closest.sq = sqDistance;
            closest.idx = idxItem[0];
          }
        }
        return closest.sq / this._sqScaleFactor < this._sqNearTolerance
          ? closest.idx
          : -1;
      },
      _calcLocatedFeatureIndexOfSList: function (pixel, list) {
        for (
          var features = this._data.geoData.sub.features,
            i = 0,
            len = list.length;
          i < len;
          i++
        ) {
          var idxItem = list[i],
            feature = features[idxItem[0]],
            ring = idxItem[2] || feature.geometry.coordinates[idxItem[1]][0];
          if (
            geomUtils.pointInPolygon(pixel, ring) ||
            geomUtils.pointOnPolygon(pixel, ring)
          )
            return idxItem[0];
        }
        return this._calcNearestFeatureIndexOfSList(pixel, list);
      },
      pixelToLngLat: function (x, y) {
        return SphericalMercator.pointToLngLat([x, y], this._data.pz);
      },
      lngLatToPixel: function (lngLat) {
        lngLat instanceof AMap.LngLat &&
        (lngLat = [lngLat.getLng(), lngLat.getLat()]);
        var pMx = SphericalMercator.lngLatToPoint(lngLat, this._data.pz);
        return [Math.round(pMx[0]), Math.round(pMx[1])];
      },
      _convertRingCoordsToLngLats: function (ring) {
        for (var list = [], i = 0, len = ring.length; i < len; i++)
          list[i] = this.pixelToLngLat(ring[i][0], ring[i][1]);
        return list;
      },
      _convertPolygonCoordsToLngLats: function (poly) {
        for (var list = [], i = 0, len = poly.length; i < len; i++)
          list[i] = this._convertRingCoordsToLngLats(poly[i]);
        return list;
      },
      _convertMultiPolygonCoordsToLngLats: function (polys) {
        for (var list = [], i = 0, len = polys.length; i < len; i++)
          list[i] = this._convertPolygonCoordsToLngLats(polys[i]);
        return list;
      },
      _convertCoordsToLngLats: function (type, coordinates) {
        switch (type) {
          case "MultiPolygon":
            return this._convertMultiPolygonCoordsToLngLats(coordinates);

          default:
            throw new Error("Unknown type", type);
        }
      },
      _createLngLatFeature: function (f, extraProps) {
        var newNode = utils.extend({}, f);
        extraProps && utils.extend(newNode.properties, extraProps);
        newNode.geometry = utils.extend({}, newNode.geometry);
        newNode.geometry.coordinates = this._convertCoordsToLngLats(
          newNode.geometry.type,
          newNode.geometry.coordinates
        );
        return newNode;
      },
      getAdcode: function () {
        return this.getProps("adcode");
      },
      getName: function () {
        return this.getProps("name");
      },
      getChildrenNum: function () {
        return this.getProps("childrenNum");
      },
      getProps: function (key) {
        var props = AreaNode.getPropsOfFeature(this._data.geoData.parent);
        return props ? (key ? props[key] : props) : null;
      },
      getParentFeature: function () {
        var geoData = this._data.geoData;
        geoData.lngLatParent ||
        (geoData.lngLatParent = this._createLngLatFeature(geoData.parent));
        return geoData.lngLatParent;
      },
      getParentFeatureInPixel: function () {
        return this._data.geoData.parent;
      },
      getSubFeatures: function () {
        var geoData = this._data.geoData;
        if (!geoData.sub) return [];
        if (!geoData.lngLatSubList) {
          for (
            var features = geoData.sub.features,
              newFList = [],
              i = 0,
              len = features.length;
            i < len;
            i++
          )
            newFList[i] = this._createLngLatFeature(features[i]);
          geoData.lngLatSubList = newFList;
        }
        return [].concat(geoData.lngLatSubList);
      },
      getSubFeaturesInPixel: function () {
        return this._data.geoData.sub
          ? [].concat(this._data.geoData.sub.features)
          : [];
      },
      getBounds: function () {
        var data = this._data;
        if (!data.lngLatBounds) {
          var nodeBounds = this._data.bounds;
          data.lngLatBounds = new AMap.Bounds(
            this.pixelToLngLat(nodeBounds.x, nodeBounds.y + nodeBounds.height),
            this.pixelToLngLat(nodeBounds.x + nodeBounds.width, nodeBounds.y)
          );
        }
        return data.lngLatBounds;
      },
    });
    return AreaNode;
  }
)(utils, SphericalMercator, Const, geomUtils, bbIdxBuilder)

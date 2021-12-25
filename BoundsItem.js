const utils = require('./utils')

module.exports = (
  function (utils) {
    function BoundsItem(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }
    utils.extend(BoundsItem, {
      getBoundsItemToExpand: function () {
        return new BoundsItem(Number.MAX_VALUE, Number.MAX_VALUE, -1, -1);
      },
      boundsContainPoint: function (b, p) {
        return (
          b.x <= p.x &&
          b.x + b.width >= p.x &&
          b.y <= p.y &&
          b.y + b.height >= p.y
        );
      },
      boundsContain: function (b1, b2) {
        return (
          b1.x <= b2.x &&
          b1.x + b1.width >= b2.x + b2.width &&
          b1.y <= b2.y &&
          b1.y + b1.height >= b2.y + b2.height
        );
      },
      boundsIntersect: function (b1, b2) {
        return (
          b1.x <= b2.x + b2.width &&
          b2.x <= b1.x + b1.width &&
          b1.y <= b2.y + b2.height &&
          b2.y <= b1.y + b1.height
        );
      },
    });
    utils.extend(BoundsItem.prototype, {
      containBounds: function (b) {
        return BoundsItem.boundsContain(this, b);
      },
      containPoint: function (p) {
        return BoundsItem.boundsContainPoint(this, p);
      },
      clone: function () {
        return new BoundsItem(this.x, this.y, this.width, this.height);
      },
      isEmpty: function () {
        return this.width < 0;
      },
      getMin: function () {
        return {
          x: this.x,
          y: this.y,
        };
      },
      getMax: function () {
        return {
          x: this.x + this.width,
          y: this.y + this.height,
        };
      },
      expandByPoint: function (x, y) {
        var minX, minY, maxX, maxY;
        if (this.isEmpty()) {
          minX = maxX = x;
          minY = maxY = y;
        } else {
          minX = this.x;
          minY = this.y;
          maxX = this.x + this.width;
          maxY = this.y + this.height;
          x < minX ? (minX = x) : x > maxX && (maxX = x);
          y < minY ? (minY = y) : y > maxY && (maxY = y);
        }
        this.x = minX;
        this.y = minY;
        this.width = maxX - minX;
        this.height = maxY - minY;
      },
      expandByBounds: function (bounds) {
        if (!bounds.isEmpty()) {
          var minX = this.x,
            minY = this.y,
            maxX = this.x + this.width,
            maxY = this.y + this.height,
            newMinX = bounds.x,
            newMaxX = bounds.x + bounds.width,
            newMinY = bounds.y,
            newMaxY = bounds.y + bounds.height;
          if (this.isEmpty()) {
            minX = newMinX;
            minY = newMinY;
            maxX = newMaxX;
            maxY = newMaxY;
          } else {
            newMinX < minX && (minX = newMinX);
            newMaxX > maxX && (maxX = newMaxX);
            newMinY < minY && (minY = newMinY);
            newMaxY > maxY && (maxY = newMaxY);
          }
          this.x = minX;
          this.y = minY;
          this.width = maxX - minX;
          this.height = maxY - minY;
        }
      },
      getTopLeft: function () {
        return {
          x: this.x,
          y: this.y,
        };
      },
      getTopRight: function () {
        return {
          x: this.x + this.width,
          y: this.y,
        };
      },
      getBottomLeft: function () {
        return {
          x: this.x,
          y: this.y + this.height,
        };
      },
      getBottomRight: function () {
        return {
          x: this.x + this.width,
          y: this.y + this.height,
        };
      },
    });
    return BoundsItem;
  }
)(utils)

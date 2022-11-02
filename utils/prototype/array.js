Array.prototype.haveNull = function () {
    for (let i = 0; i < this.length; i++) {
        if (!this[i]) return true
    }
    return false
}

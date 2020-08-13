try {
    (function (options) {
        var global = new Function("return this")();
        function Storage() {
            this.store = {};
            this.length = 0;
            this.timer = null;
            this.saveQueue = {};
            this.deleteQueue = {};
            this.forceClear = false;
            this.isSync = false;
        }
        Storage.prototype = {
            toString: function (o) {
                if (typeof o == "string") {
                    return o;
                } else {
                    try {
                        return JSON.stringify(o);
                    } catch (e) {
                        return o.toString();
                    }
                }
            },
            setItem: function (k, v) {
                try {
                    var key = this.toString(k),
                        value = this.toString(v);
                    var isExisted = false;
                    if (key in this.store) {
                        isExisted = true;
                    }
                    this.store[key] = value;
                    if (!isExisted) this.length++;
                    this.delayOP("set", key, value);
                } catch (e) {
                    console.error("storage setIterm error is,", e);
                }
            },
            getItem: function (k) {
                try {
                    return this.store[this.toString(k)];
                } catch (e) {
                    console.error("storage getItem error is,", e);
                }
            },
            removeItem: function (k) {
                try {
                    var key = this.toString(k);
                    if (key in this.store) {
                        delete this.store[this.toString(k)];
                        this.length--;
                        this.delayOP("remove", key);
                    }
                } catch (e) {
                    console.error("storage removeItem error is,", e);
                }
            },
            clear: function () {
                try {
                    this.store = {};
                    this.delayOP("clear");
                } catch (e) {
                    console.error("storage removeItem error is,", e);
                }
            },
            toJSON: function () {
                return this.store;
            },
            delayOP: function (op, k, v) {
                if (op == "set") {
                    this.saveQueue[k] = v;
                    delete this.deleteQueue[k];
                } else if (op == "get") {
                    //TODO:
                } else if (op == "remove") {
                    delete this.saveQueue[k];
                    this.deleteQueue[k] = 1;
                } else if (op == "clear") {
                    this.forceClear = true;
                    this.saveQueue = {};
                    this.deleteQueue = {};
                }
                this.sync();
            },
            sync: function () {
                clearTimeout(this.timer);
                this.timer = setTimeout(
                    function () {
                        this._sync();
                    }.bind(this),
                    0
                );
            },
            _sync: function () {
                this.isSync = true;
                if (this.forceClear) {
                    try {
                        this.forceClear = false;
                        localStorage.clear();
                    } catch (e) {
                        console.error("localStorage clear error,", e);
                    }
                } else {
                    for (var p in this.deleteQueue) {
                        localStorage.removeItem(p);
                    }
                }
                var count = 0;
                for (var p in this.saveQueue) {
                    count++;
                    localStorage.setItem(p, this.saveQueue[p]);
                }
                setTimeout(function () {
                    this.isSync = false;
                }, 300);
            },
            compare: function () {
                if (this.length != localStorage.length) {
                    return true;
                } else {
                    var jsonA = JSON.stringify(this.store);
                    var jsonB = JSON.stringify(localStorage);
                    if (jsonA != jsonB) {
                        var objB = JSON.parse(jsonB);
                        for (var p in objB) {
                            if (p in this.store) {
                                if (this.store[p] != objB[p]) {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        }
                        return false;
                    } else {
                        return false;
                    }
                }
            },
            update: function () {
                if (this.isSync == false && this.compare()) {
                    console.log(
                        "update,",
                        JSON.stringify(localStorage),
                        JSON.stringify(this.store)
                    );
                    clearTimeout(this.timer);
                    this.store = JSON.parse(JSON.stringify(localStorage));
                    this.length = localStorage.length;
                    this.timer = null;
                    this.saveQueue = {};
                    this.deleteQueue = {};
                    this.forceClear = false;
                }
            },
        };
        store = new Storage();
        store.update();
        global.storage = store;
        clearInterval(global["__store__heartbeat_timer__"]);
        global["__store__heartbeat_timer__"] = setInterval(
            function () {
                console.log("__store__heartbeat_timer__ interval sync!");
                this.update();
            }.bind(store),
            3000
        );
        if (window) {
            window.addEventListener(
                "storage",
                function () {
                    console.log("storage event sync!");
                    //clearInterval(global["__store__heartbeat_timer__"]);
                    this.update();
                }.bind(store)
            );
            window.addEventListener(
                "beforeunload",
                function () {
                    console.log("storage event sync!");
                    this._sync();
                }.bind(store)
            );
        }
    })();
} catch (e) {
    console.error("FastStorage init error,", e);
}

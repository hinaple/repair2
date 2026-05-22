(function () {
    "use strict";
    const s =
            ":host{display:block;width:100%;height:100%}*{-webkit-user-drag:none}*:not(input){-webkit-user-select:none;user-select:none}img{display:block}.container.svelte-hbb9bw{width:100%;height:fit-content;position:relative;overflow:hidden}video.svelte-hbb9bw{width:100%;height:auto}",
        e = {},
        t = "webcam";
    globalThis.InjectingCss || (globalThis.InjectingCss = {}),
        globalThis.InjectingCss[t] || (globalThis.InjectingCss[t] = [[], []]);
    const i = globalThis.InjectingCss[t],
        n = /(@font-faces*{.+?})/gms,
        o = [...s.matchAll(n)].map((l) => l[0]),
        c = s.replace(n, "").trim();
    c.length && i[0].push({ css: c, attributes: e.attributes }),
        o.length &&
            i[1].push({
                css: o.join(`
`),
                attributes: e.attributes
            });
})();
var be = Object.defineProperty;
var Mt = (t) => {
    throw TypeError(t);
};
var ye = (t, e, n) =>
    e in t ? be(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (t[e] = n);
var U = (t, e, n) => ye(t, typeof e != "symbol" ? e + "" : e, n),
    mt = (t, e, n) => e.has(t) || Mt("Cannot " + n);
var u = (t, e, n) => (mt(t, e, "read from private field"), n ? n.call(t) : e.get(t)),
    p = (t, e, n) =>
        e.has(t)
            ? Mt("Cannot add the same private member more than once")
            : e instanceof WeakSet
              ? e.add(t)
              : e.set(t, n),
    g = (t, e, n, r) => (mt(t, e, "write to private field"), r ? r.call(t, n) : e.set(t, n), n),
    O = (t, e, n) => (mt(t, e, "access private method"), n);
var Te = Array.isArray,
    ke = Array.prototype.indexOf,
    xe = Array.from,
    yt = Object.defineProperty,
    It = Object.getOwnPropertyDescriptor,
    Lt = Object.isExtensible;
function Se(t) {
    for (var e = 0; e < t.length; e++) t[e]();
}
function Ce() {
    var t,
        e,
        n = new Promise((r, i) => {
            (t = r), (e = i);
        });
    return { promise: n, resolve: t, reject: e };
}
const G = 2,
    Ct = 4,
    Ne = 8,
    Nt = 16,
    j = 32,
    Z = 64,
    zt = 128,
    P = 256,
    ct = 512,
    y = 1024,
    z = 2048,
    tt = 4096,
    J = 8192,
    gt = 16384,
    Rt = 32768,
    Re = 65536,
    Ae = 1 << 18,
    At = 1 << 19,
    De = 1 << 20,
    Pt = 1 << 21,
    Oe = 1 << 22,
    Tt = 1 << 23,
    Fe = Symbol("$state"),
    Jt = new (class extends Error {
        constructor() {
            super(...arguments);
            U(this, "name", "StaleReactionError");
            U(
                this,
                "message",
                "The reaction that called `getAbortSignal()` was re-run or destroyed"
            );
        }
    })();
function Me(t) {
    throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
function Ie(t) {
    throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function Le() {
    throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function Pe(t) {
    throw new Error("https://svelte.dev/e/effect_orphan");
}
function qe() {
    throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
const je = 2;
let S = null;
function qt(t) {
    S = t;
}
function Qt(t, e = !1, n) {
    S = {
        p: S,
        c: null,
        e: null,
        s: t,
        x: null,
        l: null
    };
}
function Xt(t) {
    var e =
            /** @type {ComponentContext} */
            S,
        n = e.e;
    if (n !== null) {
        e.e = null;
        for (var r of n) oe(r);
    }
    return (S = e.p), /** @type {T} */ {};
}
function Ue() {
    return !0;
}
const Ve = /* @__PURE__ */ new WeakMap();
function Ye(t) {
    var e = v;
    if (e === null) return (h.f |= Tt), t;
    if ((e.f & Rt) === 0) {
        if ((e.f & zt) === 0) throw (!e.parent && t instanceof Error && te(t), t);
        e.b.error(t);
    } else Zt(t, e);
}
function Zt(t, e) {
    for (; e !== null; ) {
        if ((e.f & zt) !== 0)
            try {
                e.b.error(t);
                return;
            } catch (n) {
                t = n;
            }
        e = e.parent;
    }
    throw (t instanceof Error && te(t), t);
}
function te(t) {
    const e = Ve.get(t);
    e &&
        (yt(t, "message", {
            value: e.message
        }),
        yt(t, "stack", {
            value: e.stack
        }));
}
let _t = [];
function Be() {
    var t = _t;
    (_t = []), Se(t);
}
function He(t) {
    _t.length === 0 && queueMicrotask(Be), _t.push(t);
}
function ee(t) {
    var e = t.effects;
    if (e !== null) {
        t.effects = null;
        for (var n = 0; n < e.length; n += 1)
            q(
                /** @type {Effect} */
                e[n]
            );
    }
}
function We(t) {
    for (var e = t.parent; e !== null; ) {
        if ((e.f & G) === 0)
            return (
                /** @type {Effect} */
                e
            );
        e = e.parent;
    }
    return null;
}
function $e(t) {
    var e,
        n = v;
    X(We(t));
    try {
        ee(t), (e = we(t));
    } finally {
        X(n);
    }
    return e;
}
function Ke(t) {
    var e = $e(t);
    if ((t.equals(e) || ((t.v = e), (t.wv = _n())), !Et)) {
        var n = (M || (t.f & P) !== 0) && t.deps !== null ? tt : y;
        x(t, n);
    }
}
const bt = /* @__PURE__ */ new Set();
let E = null,
    jt = /* @__PURE__ */ new Set(),
    vt = [];
function ne() {
    const t =
        /** @type {() => void} */
        vt.shift();
    vt.length > 0 && queueMicrotask(ne), t();
}
let et = [],
    Dt = null,
    kt = !1;
var nt, W, A, rt, lt, I, $, L, D, K, it, st, T, re, ot, xt;
const wt = class wt {
    constructor() {
        p(this, T);
        /**
         * The current values of any sources that are updated in this batch
         * They keys of this map are identical to `this.#previous`
         * @type {Map<Source, any>}
         */
        U(this, "current", /* @__PURE__ */ new Map());
        /**
         * The values of any sources that are updated in this batch _before_ those updates took place.
         * They keys of this map are identical to `this.#current`
         * @type {Map<Source, any>}
         */
        p(this, nt, /* @__PURE__ */ new Map());
        /**
         * When the batch is committed (and the DOM is updated), we need to remove old branches
         * and append new ones by calling the functions added inside (if/each/key/etc) blocks
         * @type {Set<() => void>}
         */
        p(this, W, /* @__PURE__ */ new Set());
        /**
         * The number of async effects that are currently in flight
         */
        p(this, A, 0);
        /**
         * A deferred that resolves when the batch is committed, used with `settled()`
         * TODO replace with Promise.withResolvers once supported widely enough
         * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
         */
        p(this, rt, null);
        /**
         * True if an async effect inside this batch resolved and
         * its parent branch was already deleted
         */
        p(this, lt, !1);
        /**
         * Async effects (created inside `async_derived`) encountered during processing.
         * These run after the rest of the batch has updated, since they should
         * always have the latest values
         * @type {Effect[]}
         */
        p(this, I, []);
        /**
         * The same as `#async_effects`, but for effects inside a newly-created
         * `<svelte:boundary>` — these do not prevent the batch from committing
         * @type {Effect[]}
         */
        p(this, $, []);
        /**
         * Template effects and `$effect.pre` effects, which run when
         * a batch is committed
         * @type {Effect[]}
         */
        p(this, L, []);
        /**
         * The same as `#render_effects`, but for `$effect` (which runs after)
         * @type {Effect[]}
         */
        p(this, D, []);
        /**
         * Block effects, which may need to re-run on subsequent flushes
         * in order to update internal sources (e.g. each block items)
         * @type {Effect[]}
         */
        p(this, K, []);
        /**
         * Deferred effects (which run after async work has completed) that are DIRTY
         * @type {Effect[]}
         */
        p(this, it, []);
        /**
         * Deferred effects that are MAYBE_DIRTY
         * @type {Effect[]}
         */
        p(this, st, []);
        /**
         * A set of branches that still exist, but will be destroyed when this batch
         * is committed — we skip over these during `process`
         * @type {Set<Effect>}
         */
        U(this, "skipped_effects", /* @__PURE__ */ new Set());
    }
    /**
     *
     * @param {Effect[]} root_effects
     */
    process(e) {
        var i;
        et = [];
        for (const l of e) O(this, T, re).call(this, l);
        if (u(this, I).length === 0 && u(this, A) === 0) {
            O(this, T, xt).call(this);
            var n = u(this, L),
                r = u(this, D);
            g(this, L, []),
                g(this, D, []),
                g(this, K, []),
                (E = null),
                Ut(n),
                Ut(r),
                E === null ? (E = this) : bt.delete(this),
                (i = u(this, rt)) == null || i.resolve();
        } else
            O(this, T, ot).call(this, u(this, L)),
                O(this, T, ot).call(this, u(this, D)),
                O(this, T, ot).call(this, u(this, K));
        for (const l of u(this, I)) H(l);
        for (const l of u(this, $)) H(l);
        g(this, I, []), g(this, $, []);
    }
    /**
     * Associate a change to a given source with the current
     * batch, noting its previous and current values
     * @param {Source} source
     * @param {any} value
     */
    capture(e, n) {
        u(this, nt).has(e) || u(this, nt).set(e, n), this.current.set(e, e.v);
    }
    activate() {
        E = this;
    }
    deactivate() {
        E = null;
        for (const e of jt) if ((jt.delete(e), e(), E !== null)) break;
    }
    neuter() {
        g(this, lt, !0);
    }
    flush() {
        et.length > 0 ? Ge() : O(this, T, xt).call(this),
            E === this && (u(this, A) === 0 && bt.delete(this), this.deactivate());
    }
    increment() {
        g(this, A, u(this, A) + 1);
    }
    decrement() {
        if ((g(this, A, u(this, A) - 1), u(this, A) === 0)) {
            for (const e of u(this, it)) x(e, z), dt(e);
            for (const e of u(this, st)) x(e, tt), dt(e);
            g(this, L, []), g(this, D, []), this.flush();
        } else this.deactivate();
    }
    /** @param {() => void} fn */
    add_callback(e) {
        u(this, W).add(e);
    }
    settled() {
        return (u(this, rt) ?? g(this, rt, Ce())).promise;
    }
    static ensure() {
        if (E === null) {
            const e = (E = new wt());
            bt.add(E),
                wt.enqueue(() => {
                    E === e && e.flush();
                });
        }
        return E;
    }
    /** @param {() => void} task */
    static enqueue(e) {
        vt.length === 0 && queueMicrotask(ne), vt.unshift(e);
    }
};
(nt = new WeakMap()),
    (W = new WeakMap()),
    (A = new WeakMap()),
    (rt = new WeakMap()),
    (lt = new WeakMap()),
    (I = new WeakMap()),
    ($ = new WeakMap()),
    (L = new WeakMap()),
    (D = new WeakMap()),
    (K = new WeakMap()),
    (it = new WeakMap()),
    (st = new WeakMap()),
    (T = new WeakSet()) /**
     * Traverse the effect tree, executing effects or stashing
     * them for later execution as appropriate
     * @param {Effect} root
     */,
    (re = function (e) {
        var m;
        e.f ^= y;
        for (var n = e.first; n !== null; ) {
            var r = n.f,
                i = (r & (j | Z)) !== 0,
                l = i && (r & y) !== 0,
                s = l || (r & J) !== 0 || this.skipped_effects.has(n);
            if (!s && n.fn !== null) {
                if (i) n.f ^= y;
                else if ((r & Ct) !== 0) u(this, D).push(n);
                else if ((r & y) === 0)
                    if ((r & Oe) !== 0) {
                        var a = (m = n.b) != null && m.pending ? u(this, $) : u(this, I);
                        a.push(n);
                    } else Ot(n) && ((n.f & Nt) !== 0 && u(this, K).push(n), H(n));
                var _ = n.first;
                if (_ !== null) {
                    n = _;
                    continue;
                }
            }
            var c = n.parent;
            for (n = n.next; n === null && c !== null; ) (n = c.next), (c = c.parent);
        }
    }) /**
     * @param {Effect[]} effects
     */,
    (ot = function (e) {
        for (const n of e) ((n.f & z) !== 0 ? u(this, it) : u(this, st)).push(n), x(n, y);
        e.length = 0;
    }) /**
     * Append and remove branches to/from the DOM
     */,
    (xt = function () {
        if (!u(this, lt)) for (const e of u(this, W)) e();
        u(this, W).clear();
    });
let ht = wt;
function Ge() {
    var t = Y;
    kt = !0;
    try {
        var e = 0;
        for (Yt(!0); et.length > 0; ) {
            var n = ht.ensure();
            if (e++ > 1e3) {
                var r, i;
                ze();
            }
            n.process(et), le.clear();
        }
    } finally {
        (kt = !1), Yt(t), (Dt = null);
    }
}
function ze() {
    try {
        qe();
    } catch (t) {
        Zt(t, Dt);
    }
}
let F = null;
function Ut(t) {
    var e = t.length;
    if (e !== 0) {
        for (var n = 0; n < e; ) {
            var r = t[n++];
            if (
                (r.f & (gt | J)) === 0 &&
                Ot(r) &&
                ((F = []),
                H(r),
                r.deps === null &&
                    r.first === null &&
                    r.nodes_start === null &&
                    (r.teardown === null && r.ac === null ? ve(r) : (r.fn = null)),
                (F == null ? void 0 : F.length) > 0)
            ) {
                le.clear();
                for (const i of F) H(i);
                F = [];
            }
        }
        F = null;
    }
}
function dt(t) {
    for (var e = (Dt = t); e.parent !== null; ) {
        e = e.parent;
        var n = e.f;
        if (kt && e === v && (n & Nt) !== 0) return;
        if ((n & (Z | j)) !== 0) {
            if ((n & y) === 0) return;
            e.f ^= y;
        }
    }
    et.push(e);
}
const le = /* @__PURE__ */ new Map();
var Vt, ie, se, ue;
function Je() {
    if (Vt === void 0) {
        (Vt = window), (ie = /Firefox/.test(navigator.userAgent));
        var t = Element.prototype,
            e = Node.prototype,
            n = Text.prototype;
        (se = It(e, "firstChild").get),
            (ue = It(e, "nextSibling").get),
            Lt(t) &&
                ((t.__click = void 0),
                (t.__className = void 0),
                (t.__attributes = null),
                (t.__style = void 0),
                (t.__e = void 0)),
            Lt(n) && (n.__t = void 0);
    }
}
function Qe(t = "") {
    return document.createTextNode(t);
}
// @__NO_SIDE_EFFECTS__
function ae(t) {
    return se.call(t);
}
// @__NO_SIDE_EFFECTS__
function Xe(t) {
    return ue.call(t);
}
function Ze(t, e) {
    return /* @__PURE__ */ ae(t);
}
function fe(t) {
    var e = h,
        n = v;
    Q(null), X(null);
    try {
        return t();
    } finally {
        Q(e), X(n);
    }
}
function tn(t) {
    v === null && h === null && Pe(),
        h !== null && (h.f & P) !== 0 && v === null && Le(),
        Et && Ie();
}
function en(t, e) {
    var n = e.last;
    n === null ? (e.last = e.first = t) : ((n.next = t), (t.prev = n), (e.last = t));
}
function ut(t, e, n, r = !0) {
    var i = v;
    i !== null && (i.f & J) !== 0 && (t |= J);
    var l = {
        ctx: S,
        deps: null,
        nodes_start: null,
        nodes_end: null,
        f: t | z,
        first: null,
        fn: e,
        last: null,
        next: null,
        parent: i,
        b: i && i.b,
        prev: null,
        teardown: null,
        transitions: null,
        wv: 0,
        ac: null
    };
    if (n)
        try {
            H(l), (l.f |= Rt);
        } catch (_) {
            throw (q(l), _);
        }
    else e !== null && dt(l);
    if (r) {
        var s = l;
        if (
            (n &&
                s.deps === null &&
                s.teardown === null &&
                s.nodes_start === null &&
                s.first === s.last && // either `null`, or a singular child
                (s.f & At) === 0 &&
                (s = s.first),
            s !== null &&
                ((s.parent = i),
                i !== null && en(s, i),
                h !== null && (h.f & G) !== 0 && (t & Z) === 0))
        ) {
            var a =
                /** @type {Derived} */
                h;
            (a.effects ?? (a.effects = [])).push(s);
        }
    }
    return l;
}
function nn(t) {
    tn();
    var e =
            /** @type {Effect} */
            v.f,
        n = !h && (e & j) !== 0 && (e & Rt) === 0;
    if (n) {
        var r =
            /** @type {ComponentContext} */
            S;
        (r.e ?? (r.e = [])).push(t);
    } else return oe(t);
}
function oe(t) {
    return ut(Ct | De, t, !1);
}
function rn(t) {
    ht.ensure();
    const e = ut(Z | At, t, !0);
    return (n = {}) =>
        new Promise((r) => {
            n.outro
                ? on(e, () => {
                      q(e), r(void 0);
                  })
                : (q(e), r(void 0));
        });
}
function ln(t) {
    return ut(Ct, t, !1);
}
function sn(t, e = 0) {
    return ut(Ne | e, t, !0);
}
function un(t, e = !0) {
    return ut(j | At, t, !0, e);
}
function ce(t) {
    var e = t.teardown;
    if (e !== null) {
        const n = Et,
            r = h;
        Bt(!0), Q(null);
        try {
            e.call(null);
        } finally {
            Bt(n), Q(r);
        }
    }
}
function _e(t, e = !1) {
    var n = t.first;
    for (t.first = t.last = null; n !== null; ) {
        const i = n.ac;
        i !== null &&
            fe(() => {
                i.abort(Jt);
            });
        var r = n.next;
        (n.f & Z) !== 0 ? (n.parent = null) : q(n, e), (n = r);
    }
}
function an(t) {
    for (var e = t.first; e !== null; ) {
        var n = e.next;
        (e.f & j) === 0 && q(e), (e = n);
    }
}
function q(t, e = !0) {
    var n = !1;
    (e || (t.f & Ae) !== 0) &&
        t.nodes_start !== null &&
        t.nodes_end !== null &&
        (fn(
            t.nodes_start,
            /** @type {TemplateNode} */
            t.nodes_end
        ),
        (n = !0)),
        _e(t, e && !n),
        pt(t, 0),
        x(t, gt);
    var r = t.transitions;
    if (r !== null) for (const l of r) l.stop();
    ce(t);
    var i = t.parent;
    i !== null && i.first !== null && ve(t),
        (t.next =
            t.prev =
            t.teardown =
            t.ctx =
            t.deps =
            t.fn =
            t.nodes_start =
            t.nodes_end =
            t.ac =
                null);
}
function fn(t, e) {
    for (; t !== null; ) {
        var n =
            t === e
                ? null
                : /** @type {TemplateNode} */
                  /* @__PURE__ */ Xe(t);
        t.remove(), (t = n);
    }
}
function ve(t) {
    var e = t.parent,
        n = t.prev,
        r = t.next;
    n !== null && (n.next = r),
        r !== null && (r.prev = n),
        e !== null && (e.first === t && (e.first = r), e.last === t && (e.last = n));
}
function on(t, e) {
    var n = [];
    he(t, n, !0),
        cn(n, () => {
            q(t), e && e();
        });
}
function cn(t, e) {
    var n = t.length;
    if (n > 0) {
        var r = () => --n || e();
        for (var i of t) i.out(r);
    } else e();
}
function he(t, e, n) {
    if ((t.f & J) === 0) {
        if (((t.f ^= J), t.transitions !== null))
            for (const s of t.transitions) (s.is_global || n) && e.push(s);
        for (var r = t.first; r !== null; ) {
            var i = r.next,
                l = (r.f & Re) !== 0 || (r.f & j) !== 0;
            he(r, e, l ? n : !1), (r = i);
        }
    }
}
let Y = !1;
function Yt(t) {
    Y = t;
}
let Et = !1;
function Bt(t) {
    Et = t;
}
let h = null,
    R = !1;
function Q(t) {
    h = t;
}
let v = null;
function X(t) {
    v = t;
}
let B = null,
    k = null,
    b = 0,
    N = null,
    de = 1,
    Ht = 0,
    M = !1;
function _n() {
    return ++de;
}
function Ot(t) {
    var d;
    var e = t.f;
    if ((e & z) !== 0) return !0;
    if ((e & tt) !== 0) {
        var n = t.deps,
            r = (e & P) !== 0;
        if (n !== null) {
            var i,
                l,
                s = (e & ct) !== 0,
                a = r && v !== null && !M,
                _ = n.length;
            if ((s || a) && (v === null || (v.f & gt) === 0)) {
                var c =
                        /** @type {Derived} */
                        t,
                    m = c.parent;
                for (i = 0; i < _; i++)
                    (l = n[i]),
                        (s || !((d = l == null ? void 0 : l.reactions) != null && d.includes(c))) &&
                            (l.reactions ?? (l.reactions = [])).push(c);
                s && (c.f ^= ct), a && m !== null && (m.f & P) === 0 && (c.f ^= P);
            }
            for (i = 0; i < _; i++)
                if (
                    ((l = n[i]),
                    Ot(
                        /** @type {Derived} */
                        l
                    ) &&
                        Ke(
                            /** @type {Derived} */
                            l
                        ),
                    l.wv > t.wv)
                )
                    return !0;
        }
        (!r || (v !== null && !M)) && x(t, y);
    }
    return !1;
}
function pe(t, e, n = !0) {
    var r = t.reactions;
    if (r !== null && !(B != null && B.includes(t)))
        for (var i = 0; i < r.length; i++) {
            var l = r[i];
            (l.f & G) !== 0
                ? pe(
                      /** @type {Derived} */
                      l,
                      e,
                      !1
                  )
                : e === l &&
                  (n ? x(l, z) : (l.f & y) !== 0 && x(l, tt),
                  dt(
                      /** @type {Effect} */
                      l
                  ));
        }
}
function we(t) {
    var w;
    var e = k,
        n = b,
        r = N,
        i = h,
        l = M,
        s = B,
        a = S,
        _ = R,
        c = t.f;
    (k = /** @type {null | Value[]} */ null),
        (b = 0),
        (N = null),
        (M = (c & P) !== 0 && (R || !Y || h === null)),
        (h = (c & (j | Z)) === 0 ? t : null),
        (B = null),
        qt(t.ctx),
        (R = !1),
        ++Ht,
        t.ac !== null &&
            (fe(() => {
                t.ac.abort(Jt);
            }),
            (t.ac = null));
    try {
        t.f |= Pt;
        var m =
                /** @type {Function} */
                t.fn,
            d = m(),
            o = t.deps;
        if (k !== null) {
            var f;
            if ((pt(t, b), o !== null && b > 0))
                for (o.length = b + k.length, f = 0; f < k.length; f++) o[b + f] = k[f];
            else t.deps = o = k;
            if (
                !M || // Deriveds that already have reactions can cleanup, so we still add them as reactions
                ((c & G) !== 0 && /** @type {import('#client').Derived} */ t.reactions !== null)
            )
                for (f = b; f < o.length; f++) ((w = o[f]).reactions ?? (w.reactions = [])).push(t);
        } else o !== null && b < o.length && (pt(t, b), (o.length = b));
        if (Ue() && N !== null && !R && o !== null && (t.f & (G | tt | z)) === 0)
            for (f = 0; f < /** @type {Source[]} */ N.length; f++)
                pe(
                    N[f],
                    /** @type {Effect} */
                    t
                );
        return (
            i !== null &&
                i !== t &&
                (Ht++, N !== null && (r === null ? (r = N) : r.push(.../** @type {Source[]} */ N))),
            (t.f & Tt) !== 0 && (t.f ^= Tt),
            d
        );
    } catch (C) {
        return Ye(C);
    } finally {
        (t.f ^= Pt), (k = e), (b = n), (N = r), (h = i), (M = l), (B = s), qt(a), (R = _);
    }
}
function vn(t, e) {
    let n = e.reactions;
    if (n !== null) {
        var r = ke.call(n, t);
        if (r !== -1) {
            var i = n.length - 1;
            i === 0 ? (n = e.reactions = null) : ((n[r] = n[i]), n.pop());
        }
    }
    n === null &&
        (e.f & G) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
        // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
        // allows us to skip the expensive work of disconnecting and immediately reconnecting it
        (k === null || !k.includes(e)) &&
        (x(e, tt),
        (e.f & (P | ct)) === 0 && (e.f ^= ct),
        ee(
            /** @type {Derived} **/
            e
        ),
        pt(
            /** @type {Derived} **/
            e,
            0
        ));
}
function pt(t, e) {
    var n = t.deps;
    if (n !== null) for (var r = e; r < n.length; r++) vn(t, n[r]);
}
function H(t) {
    var e = t.f;
    if ((e & gt) === 0) {
        x(t, y);
        var n = v,
            r = Y;
        (v = t), (Y = !0);
        try {
            (e & Nt) !== 0 ? an(t) : _e(t), ce(t);
            var i = we(t);
            (t.teardown = typeof i == "function" ? i : null), (t.wv = de);
            var l;
        } finally {
            (Y = r), (v = n);
        }
    }
}
function ge(t) {
    var e = R;
    try {
        return (R = !0), t();
    } finally {
        R = e;
    }
}
const hn = -7169;
function x(t, e) {
    t.f = (t.f & hn) | e;
}
const dn = ["touchstart", "touchmove"];
function pn(t) {
    return dn.includes(t);
}
const wn = /* @__PURE__ */ new Set(),
    Wt = /* @__PURE__ */ new Set();
let $t = null;
function ft(t) {
    var Ft;
    var e = this,
        n =
            /** @type {Node} */
            e.ownerDocument,
        r = t.type,
        i = ((Ft = t.composedPath) == null ? void 0 : Ft.call(t)) || [],
        l =
            /** @type {null | Element} */
            i[0] || t.target;
    $t = t;
    var s = 0,
        a = $t === t && t.__root;
    if (a) {
        var _ = i.indexOf(a);
        if (_ !== -1 && (e === document || e === /** @type {any} */ window)) {
            t.__root = e;
            return;
        }
        var c = i.indexOf(e);
        if (c === -1) return;
        _ <= c && (s = _);
    }
    if (((l = /** @type {Element} */ i[s] || t.target), l !== e)) {
        yt(t, "currentTarget", {
            configurable: !0,
            get() {
                return l || n;
            }
        });
        var m = h,
            d = v;
        Q(null), X(null);
        try {
            for (var o, f = []; l !== null; ) {
                var w = l.assignedSlot || l.parentNode || /** @type {any} */ l.host || null;
                try {
                    var C = l["__" + r];
                    if (
                        C != null &&
                        (!(/** @type {any} */ l.disabled) || // DOM could've been updated already by the time this is reached, so we check this as well
                            // -> the target could not have been disabled because it emits the event in the first place
                            t.target === l)
                    )
                        if (Te(C)) {
                            var [Ee, ...me] = C;
                            Ee.apply(l, [t, ...me]);
                        } else C.call(l, t);
                } catch (at) {
                    o ? f.push(at) : (o = at);
                }
                if (t.cancelBubble || w === e || w === null) break;
                l = w;
            }
            if (o) {
                for (let at of f)
                    queueMicrotask(() => {
                        throw at;
                    });
                throw o;
            }
        } finally {
            (t.__root = e), delete t.currentTarget, Q(m), X(d);
        }
    }
}
function gn(t) {
    var e = document.createElement("template");
    return (e.innerHTML = t.replaceAll("<!>", "<!---->")), e.content;
}
function En(t, e) {
    var n =
        /** @type {Effect} */
        v;
    n.nodes_start === null && ((n.nodes_start = t), (n.nodes_end = e));
}
// @__NO_SIDE_EFFECTS__
function mn(t, e) {
    var n = (e & je) !== 0,
        r,
        i = !t.startsWith("<!>");
    return () => {
        r === void 0 &&
            ((r = gn(i ? t : "<!>" + t)), (r = /** @type {Node} */ /* @__PURE__ */ ae(r)));
        var l =
            /** @type {TemplateNode} */
            n || ie ? document.importNode(r, !0) : r.cloneNode(!0);
        return En(l, l), l;
    };
}
function bn(t, e) {
    t !== null &&
        t.before(
            /** @type {Node} */
            e
        );
}
function yn(t, e) {
    return Tn(t, e);
}
const V = /* @__PURE__ */ new Map();
function Tn(t, { target: e, anchor: n, props: r = {}, events: i, context: l, intro: s = !0 }) {
    Je();
    var a = /* @__PURE__ */ new Set(),
        _ = (d) => {
            for (var o = 0; o < d.length; o++) {
                var f = d[o];
                if (!a.has(f)) {
                    a.add(f);
                    var w = pn(f);
                    e.addEventListener(f, ft, { passive: w });
                    var C = V.get(f);
                    C === void 0
                        ? (document.addEventListener(f, ft, { passive: w }), V.set(f, 1))
                        : V.set(f, C + 1);
                }
            }
        };
    _(xe(wn)), Wt.add(_);
    var c = void 0,
        m = rn(() => {
            var d = n ?? e.appendChild(Qe());
            return (
                un(() => {
                    if (l) {
                        Qt({});
                        var o =
                            /** @type {ComponentContext} */
                            S;
                        o.c = l;
                    }
                    i && (r.$$events = i), (c = t(d, r) || {}), l && Xt();
                }),
                () => {
                    var w;
                    for (var o of a) {
                        e.removeEventListener(o, ft);
                        var f =
                            /** @type {number} */
                            V.get(o);
                        --f === 0
                            ? (document.removeEventListener(o, ft), V.delete(o))
                            : V.set(o, f);
                    }
                    Wt.delete(_), d !== n && ((w = d.parentNode) == null || w.removeChild(d));
                }
            );
        });
    return St.set(c, m), c;
}
let St = /* @__PURE__ */ new WeakMap();
function kn(t, e) {
    const n = St.get(t);
    return n ? (St.delete(t), n(e)) : Promise.resolve();
}
function Kt(t, e) {
    return t === e || (t == null ? void 0 : t[Fe]) === e;
}
function xn(t = {}, e, n, r) {
    return (
        ln(() => {
            var i, l;
            return (
                sn(() => {
                    (i = l),
                        (l = []),
                        ge(() => {
                            t !== n(...l) && (e(t, ...l), i && Kt(n(...i), t) && e(null, ...i));
                        });
                }),
                () => {
                    He(() => {
                        l && Kt(n(...l), t) && e(null, ...l);
                    });
                }
            );
        }),
        t
    );
}
function Sn(t, e, n, r) {
    var i =
            /** @type {V} */
            r,
        l = !0,
        s = () => (l && ((l = !1), (i = /** @type {V} */ r)), i),
        a;
    (a = /** @type {V} */ t[e]), a === void 0 && r !== void 0 && (a = s());
    var _;
    return (
        (_ = () => {
            var c =
                /** @type {V} */
                t[e];
            return c === void 0 ? s() : ((l = !0), c);
        }),
        _
    );
}
function Cn(t) {
    S === null && Me(),
        nn(() => {
            const e = ge(t);
            if (typeof e == "function")
                return (
                    /** @type {() => void} */
                    e
                );
        });
}
function Nn(t, e, n) {
    e &&
        e.forEach((r, i) => {
            r &&
                r.forEach(({ css: l, attributes: s }) => {
                    const a = document.createElement("style");
                    (a.dataset.pluginName = t),
                        s &&
                            Object.entries(s).forEach(([_, c]) => {
                                a.setAttribute(_, c);
                            }),
                        a.appendChild(document.createTextNode(l)),
                        (i === 0 ? n : document.head).appendChild(a);
                });
        });
}
function Rn(t) {
    document
        .querySelectorAll(`style[data-plugin-name=${t}]`)
        .forEach((e) => e.parentNode.removeChild(e));
}
const An = "5";
var Gt;
typeof window < "u" &&
    ((Gt = window.__svelte ?? (window.__svelte = {})).v ?? (Gt.v = /* @__PURE__ */ new Set())).add(
        An
    );
var Dn = /* @__PURE__ */ mn(
    '<div class="container svelte-hbb9bw"><video class="svelte-hbb9bw"></video></div>',
    2
);
function On(t, e) {
    Qt(e, !0);
    let n = Sn(e, "camera", 3, null),
        r;
    Cn(async () => {
        try {
            const s = (await navigator.mediaDevices.enumerateDevices()).filter(
                (_) => _.kind === "videoinput"
            );
            console.log(s);
            const a = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: s[Number(n() ?? 0)].deviceId } },
                audio: !1
            });
            (r.srcObject = a), r.play();
        } catch (s) {
            console.log(s);
        }
    });
    var i = Dn(),
        l = Ze(i);
    xn(
        l,
        (s) => (r = s),
        () => r
    ),
        bn(t, i),
        Xt();
}
class Fn extends HTMLElement {
    constructor({ attributes: e = {}, isDev: n = !1 }) {
        super(), this.attachShadow({ mode: "open" }), (this.attributesObj = { ...e, isDev: n });
    }
    connectedCallback() {
        const e = (n, r = null) => {
            this.shadowRoot.dispatchEvent(new CustomEvent(n, { composed: !0, detail: r }));
        };
        (this.component = yn(On, {
            target: this.shadowRoot,
            props: { ...this.attributesObj, dispatchEvent: e }
        })),
            Nn("webcam", globalThis.InjectingCss.webcam, this.shadowRoot);
    }
    disconnectedCallback() {
        this.component && kn(this.component), (this.component = null), Rn("webcam");
    }
}
U(Fn, "attributes", ["camera"]);
export { Fn as default };

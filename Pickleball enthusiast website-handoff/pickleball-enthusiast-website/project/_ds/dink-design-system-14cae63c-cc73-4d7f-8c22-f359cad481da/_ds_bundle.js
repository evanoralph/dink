/* @ds-bundle: {"format":4,"namespace":"DinkDesignSystem_14cae6","components":[{"name":"Ball","sourcePath":"components/brand/Ball.jsx"},{"name":"Marquee","sourcePath":"components/brand/Marquee.jsx"},{"name":"Paddle","sourcePath":"components/brand/Paddle.jsx"},{"name":"RallyLoader","sourcePath":"components/brand/RallyLoader.jsx"},{"name":"ScoreCounter","sourcePath":"components/brand/ScoreCounter.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/brand/Ball.jsx":"fd1a4b2246a9","components/brand/Marquee.jsx":"1a72392bb3c8","components/brand/Paddle.jsx":"cc4ef6b11c60","components/brand/RallyLoader.jsx":"d4183f07b029","components/brand/ScoreCounter.jsx":"dfd9a5d62168","components/core/Badge.jsx":"829f2b4b62e7","components/core/Button.jsx":"385ee18142f7","components/core/Card.jsx":"018a291374b1","components/core/IconButton.jsx":"32086af73d52","components/core/Tag.jsx":"9ed8dd37371a","components/feedback/Dialog.jsx":"46b84d01b82e","components/feedback/Toast.jsx":"12aef7aa7270","components/feedback/Tooltip.jsx":"565ee93d6ac7","components/forms/Checkbox.jsx":"30e3e594fc7a","components/forms/Input.jsx":"064f9d6c91d0","components/forms/Radio.jsx":"bb3e603de9d6","components/forms/Select.jsx":"b986797ac8ae","components/forms/Switch.jsx":"9b4ddbba91b6","components/navigation/Tabs.jsx":"b46acb1e0172","ui_kits/app/AppShell.jsx":"55fd8eccc41d","ui_kits/app/BookScreen.jsx":"b69657db0c0c","ui_kits/app/HomeScreen.jsx":"f08ec038b5cd","ui_kits/app/MatchScreen.jsx":"d4494d5a488d","ui_kits/app/ProfileScreen.jsx":"5258a9785ba0","ui_kits/app/kit-utils.jsx":"4a962cb328f0","ui_kits/web/HomePage.jsx":"0c487b0683af","ui_kits/web/SiteHeader.jsx":"20d5f2f31cce"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DinkDesignSystem_14cae6 = window.DinkDesignSystem_14cae6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Ball.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const HOLES = [[50, 16, 13, 8, -6], [26, 30, 12, 8, -18], [74, 30, 12, 8, 18], [50, 42, 15, 10, 0], [17, 55, 11, 9, -8], [83, 55, 11, 9, 8], [36, 62, 13, 10, -4], [64, 62, 13, 10, 4], [50, 80, 12, 8, 0], [28, 86, 9, 6, -14], [72, 86, 9, 6, 14]];
const ANIM = {
  none: "none",
  bounce: "ds-bounce var(--dur-rally) var(--ease-in-out) infinite",
  spin: "ds-spin var(--dur-spin) linear infinite",
  float: "ds-arc-y 2.4s var(--ease-in-out) infinite",
  pop: "ds-pop-in var(--dur-slow) var(--ease-bounce) both"
};

/** The brand's hero object: a drilled outdoor pickleball, rendered in CSS. */
function Ball({
  size = 64,
  animation = "none",
  color = "var(--volt-400)",
  shadow = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    style: {
      position: "relative",
      display: "inline-block",
      width: size,
      height: size,
      flex: "none",
      borderRadius: "50%",
      transformOrigin: "50% 100%",
      background: `radial-gradient(circle at 32% 26%, color-mix(in oklab, ${color} 70%, white) 0%, ${color} 46%, color-mix(in oklab, ${color} 74%, var(--carbon-900)) 100%)`,
      boxShadow: shadow ? "var(--shadow-md), inset -4px -6px 12px rgba(17,17,16,0.22)" : "inset -4px -6px 12px rgba(17,17,16,0.22)",
      animation: ANIM[animation] || "none",
      ...style
    }
  }), HOLES.map(([x, y, w, h, rot], i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      width: `${w}%`,
      height: `${h}%`,
      transform: `translate(-50%,-50%) rotate(${rot}deg)`,
      borderRadius: "50%",
      background: "rgba(10,28,19,0.42)",
      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: "26%",
      top: "18%",
      width: "26%",
      height: "18%",
      borderRadius: "50%",
      background: "rgba(255,255,255,0.45)",
      filter: "blur(4px)",
      pointerEvents: "none"
    }
  }));
}
Object.assign(__ds_scope, { Ball });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Ball.jsx", error: String((e && e.message) || e) }); }

// components/brand/Marquee.jsx
try { (() => {
/** Scrolling uppercase ticker — the brand's loudest band of type. */
function Marquee({
  items = [],
  speed = 18,
  tone = "volt",
  height = 44
}) {
  const tones = {
    volt: {
      bg: "var(--volt-400)",
      fg: "var(--carbon-900)"
    },
    dark: {
      bg: "var(--carbon-900)",
      fg: "var(--volt-400)"
    },
    blue: {
      bg: "var(--baseline-500)",
      fg: "var(--cream-50)"
    }
  }[tone];
  const run = [...items, ...items];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: "hidden",
      background: tones.bg,
      color: tones.fg,
      height,
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-8)",
      paddingRight: "var(--space-8)",
      whiteSpace: "nowrap",
      animation: `ds-marquee ${speed}s linear infinite`
    }
  }, run.map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      font: `var(--weight-bold) var(--text-sm)/1 var(--font-sans)`,
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-8)"
    }
  }, t, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "currentColor",
      opacity: 0.7
    }
  })))));
}
Object.assign(__ds_scope, { Marquee });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Marquee.jsx", error: String((e && e.message) || e) }); }

// components/brand/Paddle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ANIM = {
  none: "none",
  swing: "ds-swing 1.6s var(--ease-swing) infinite",
  ready: "ds-arc-y 3s var(--ease-in-out) infinite"
};

/** A carbon-face paddle rendered in CSS, with an optional swing loop. */
function Paddle({
  size = 120,
  animation = "none",
  face = "var(--carbon-900)",
  edge = "var(--volt-400)",
  label = "",
  style,
  ...rest
}) {
  const w = size,
    h = size * 1.42;
  return /*#__PURE__*/React.createElement("span", _extends({}, rest, {
    style: {
      position: "relative",
      display: "inline-block",
      width: w,
      height: h,
      flex: "none",
      transformOrigin: "50% 92%",
      animation: ANIM[animation] || "none",
      ...style
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: `0 0 34% 0`,
      borderRadius: "var(--radius-lg) var(--radius-lg) 26% 26%",
      background: `linear-gradient(150deg, color-mix(in oklab, ${face} 82%, white) 0%, ${face} 42%, ${face} 100%)`,
      boxShadow: `0 0 0 ${Math.max(2, size * 0.022)}px ${edge}, var(--shadow-md)`,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      background: "repeating-linear-gradient(115deg, rgba(255,255,255,0.055) 0 1px, transparent 1px 5px)"
    }
  }), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: "16%",
      textAlign: "center",
      font: `var(--weight-bold) ${Math.max(8, size * 0.085)}px/1 var(--font-sans)`,
      letterSpacing: "var(--label-tracking)",
      color: "var(--cream-50)",
      textTransform: "uppercase"
    }
  }, label) : null), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: "50%",
      bottom: 0,
      transform: "translateX(-50%)",
      width: size * 0.19,
      height: "37%",
      borderRadius: `0 0 ${size * 0.06}px ${size * 0.06}px`,
      background: `linear-gradient(90deg, var(--carbon-700), var(--carbon-900) 60%, var(--carbon-700))`,
      backgroundImage: "repeating-linear-gradient(75deg, rgba(255,255,255,0.10) 0 2px, transparent 2px 7px)"
    }
  }));
}
Object.assign(__ds_scope, { Paddle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Paddle.jsx", error: String((e && e.message) || e) }); }

// components/brand/RallyLoader.jsx
try { (() => {
/** Loading / empty state: a paddle rallying a ball back and forth. */
function RallyLoader({
  label = "Loading rally…",
  width = 320,
  scale = 1
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width,
      height: 120 * scale,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Paddle, {
    size: 64 * scale,
    animation: "swing"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "26%",
      bottom: 18 * scale,
      animation: "ds-rally-x var(--dur-rally) var(--ease-in-out) infinite",
      ["--rally-dist"]: `${width * 0.42}px`
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Ball, {
    size: 26 * scale,
    animation: "float"
  })), /*#__PURE__*/React.createElement(__ds_scope.Paddle, {
    size: 64 * scale,
    animation: "swing",
    style: {
      transform: "scaleX(-1)",
      animationDelay: "0.45s"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 6 * scale,
      height: 2,
      background: "var(--border-hairline)"
    }
  })), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { RallyLoader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/RallyLoader.jsx", error: String((e && e.message) || e) }); }

// components/brand/ScoreCounter.jsx
try { (() => {
/** Live score readout. Each digit pops when the value changes. */
function ScoreCounter({
  value = 0,
  label = "",
  size = "md",
  tone = "volt"
}) {
  const [flash, setFlash] = React.useState(0);
  const prev = React.useRef(value);
  React.useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(f => f + 1);
    }
  }, [value]);
  const sizes = {
    sm: {
      n: "var(--data-md)",
      pad: "var(--space-2) var(--space-3)"
    },
    md: {
      n: "var(--data-lg)",
      pad: "var(--space-3) var(--space-5)"
    }
  }[size];
  const tones = {
    volt: {
      bg: "var(--volt-400)",
      fg: "var(--carbon-900)"
    },
    dark: {
      bg: "var(--carbon-900)",
      fg: "var(--cream-50)"
    },
    court: {
      bg: "var(--court-500)",
      fg: "var(--cream-50)"
    }
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    key: flash,
    style: {
      font: `var(--weight-bold) ${sizes.n}/1 var(--font-mono)`,
      padding: sizes.pad,
      minWidth: "2ch",
      textAlign: "center",
      background: tones.bg,
      color: tones.fg,
      borderRadius: "var(--radius-md)",
      fontVariantNumeric: "tabular-nums",
      animation: "ds-pop-in var(--dur-base) var(--ease-bounce) both"
    }
  }, value), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { ScoreCounter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/ScoreCounter.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
/** Small status marker. `live` pulses. */
function Badge({
  children,
  tone = "neutral",
  live = false,
  style
}) {
  const tones = {
    neutral: {
      background: "var(--cream-100)",
      color: "var(--text-body)"
    },
    volt: {
      background: "var(--volt-400)",
      color: "var(--carbon-900)"
    },
    dark: {
      background: "var(--carbon-900)",
      color: "var(--cream-50)"
    },
    live: {
      background: "var(--status-live)",
      color: "#fff"
    },
    info: {
      background: "var(--baseline-500)",
      color: "#fff"
    }
  }[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "5px var(--space-3)",
      borderRadius: "var(--radius-pill)",
      font: "var(--weight-bold) var(--text-xs)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      ...tones,
      ...style
    }
  }, live ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "currentColor",
      animation: "ds-pulse-ring 1.4s var(--ease-out) infinite"
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    h: "var(--control-h-sm)",
    px: "var(--space-4)",
    fs: "var(--text-xs)"
  },
  md: {
    h: "var(--control-h-md)",
    px: "var(--space-6)",
    fs: "var(--text-sm)"
  },
  lg: {
    h: "var(--control-h-lg)",
    px: "var(--space-8)",
    fs: "var(--text-md)"
  }
};
const VARIANTS = {
  primary: {
    background: "var(--action-primary)",
    color: "var(--action-on-primary)",
    border: "var(--border-2) solid var(--carbon-900)",
    boxShadow: "var(--shadow-hard)"
  },
  secondary: {
    background: "var(--action-secondary)",
    color: "var(--action-on-secondary)",
    border: "var(--border-2) solid var(--carbon-900)",
    boxShadow: "var(--shadow-hard-volt)"
  },
  outline: {
    background: "transparent",
    color: "var(--carbon-900)",
    border: "var(--border-2) solid var(--carbon-900)",
    boxShadow: "none"
  },
  ghost: {
    background: "transparent",
    color: "var(--carbon-900)",
    border: "var(--border-2) solid transparent",
    boxShadow: "none"
  }
};

/** Primary action. Hover lifts off its hard shadow; press drives it back down. */
function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  iconLeft,
  iconRight,
  style,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  const [p, setP] = React.useState(false);
  const s = SIZES[size],
    v = VARIANTS[variant];
  const lift = !disabled && h && !p;
  return /*#__PURE__*/React.createElement("button", _extends({}, rest, {
    disabled: disabled,
    onMouseEnter: e => {
      setH(true);
      rest.onMouseEnter?.(e);
    },
    onMouseLeave: e => {
      setH(false);
      setP(false);
      rest.onMouseLeave?.(e);
    },
    onMouseDown: e => {
      setP(true);
      rest.onMouseDown?.(e);
    },
    onMouseUp: e => {
      setP(false);
      rest.onMouseUp?.(e);
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "var(--space-2)",
      height: s.h,
      padding: `0 ${s.px}`,
      width: fullWidth ? "100%" : "auto",
      font: `var(--weight-bold) ${s.fs}/1 var(--font-sans)`,
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      borderRadius: "var(--radius-pill)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.42 : 1,
      transition: "transform var(--dur-fast) var(--ease-bounce), box-shadow var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)",
      transform: p ? "translate(3px, 3px)" : lift ? "translate(-1px, -2px)" : "none",
      ...v,
      background: h && !disabled && variant === "primary" ? "var(--action-primary-hover)" : h && !disabled && variant === "ghost" ? "var(--cream-100)" : v.background,
      boxShadow: p ? "0 0 0 var(--carbon-900)" : lift ? variant === "secondary" ? "6px 6px 0 var(--volt-400)" : variant === "primary" ? "6px 6px 0 var(--carbon-900)" : v.boxShadow : v.boxShadow,
      ...style
    }
  }), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Content container. Interactive cards lift on hover. */
function Card({
  children,
  tone = "light",
  interactive = false,
  padding = "var(--space-6)",
  style,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  const tones = {
    light: {
      background: "var(--surface-card)",
      color: "var(--text-body)",
      border: "var(--border-1) solid var(--border-hairline)"
    },
    sunken: {
      background: "var(--surface-sunken)",
      color: "var(--text-body)",
      border: "var(--border-1) solid var(--border-hairline)"
    },
    dark: {
      background: "var(--surface-card-dark)",
      color: "var(--text-inverse)",
      border: "var(--border-1) solid var(--border-dark)"
    },
    volt: {
      background: "var(--volt-400)",
      color: "var(--carbon-900)",
      border: "var(--border-2) solid var(--carbon-900)"
    }
  }[tone];
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    onMouseEnter: () => interactive && setH(true),
    onMouseLeave: () => interactive && setH(false),
    style: {
      borderRadius: "var(--radius-lg)",
      padding,
      ...tones,
      boxShadow: h ? "var(--shadow-lg)" : "var(--shadow-sm)",
      transform: h ? "translateY(-3px)" : "none",
      cursor: interactive ? "pointer" : "default",
      transition: "transform var(--dur-base) var(--ease-bounce), box-shadow var(--dur-base) var(--ease-out)",
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Square-ish icon-only action. */
function IconButton({
  children,
  variant = "outline",
  size = 44,
  label,
  style,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  const v = {
    solid: {
      background: "var(--carbon-900)",
      color: "var(--volt-400)",
      border: "var(--border-2) solid var(--carbon-900)"
    },
    volt: {
      background: "var(--volt-400)",
      color: "var(--carbon-900)",
      border: "var(--border-2) solid var(--carbon-900)"
    },
    outline: {
      background: "transparent",
      color: "var(--carbon-900)",
      border: "var(--border-2) solid var(--carbon-900)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-muted)",
      border: "var(--border-2) solid transparent"
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({}, rest, {
    "aria-label": label,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      width: size,
      height: size,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      ...v,
      transition: "transform var(--dur-fast) var(--ease-bounce), background var(--dur-fast) var(--ease-out)",
      transform: h ? "translateY(var(--hover-lift))" : "none",
      background: h && variant === "ghost" ? "var(--cream-100)" : v.background,
      ...style
    }
  }), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
/** Selectable filter chip. */
function Tag({
  children,
  selected = false,
  onClick,
  icon,
  style
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-2)",
      height: 34,
      padding: "0 var(--space-4)",
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      flex: "none",
      whiteSpace: "nowrap",
      font: "var(--weight-semibold) var(--text-sm)/1 var(--font-sans)",
      background: selected ? "var(--carbon-900)" : h ? "var(--cream-100)" : "transparent",
      color: selected ? "var(--volt-400)" : "var(--text-body)",
      border: `var(--border-1) solid ${selected ? "var(--carbon-900)" : "var(--border-hairline)"}`,
      transition: "all var(--dur-fast) var(--ease-out)",
      ...style
    }
  }, icon, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/** Centred modal that pops in on the bounce curve. */
function Dialog({
  open = false,
  title,
  children,
  footer,
  onClose,
  width = 460
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 60,
      display: "grid",
      placeItems: "center",
      padding: "var(--space-6)",
      background: "rgba(10,28,19,0.55)",
      backdropFilter: "var(--blur-glass)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: width,
      background: "var(--surface-card)",
      borderRadius: "var(--radius-lg)",
      border: "var(--border-2) solid var(--carbon-900)",
      boxShadow: "var(--shadow-lg)",
      overflow: "hidden",
      animation: "ds-pop-in var(--dur-base) var(--ease-bounce) both"
    }
  }, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-6) var(--space-6) 0"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: `400 var(--display-sm)/var(--display-leading) var(--font-display)`,
      textTransform: "uppercase",
      color: "var(--carbon-900)"
    }
  }, title)) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-4) var(--space-6) var(--space-6)",
      font: "var(--weight-regular) var(--text-md)/var(--text-leading) var(--font-sans)",
      color: "var(--text-body)"
    }
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "var(--space-3)",
      padding: "var(--space-4) var(--space-6)",
      background: "var(--surface-sunken)",
      borderTop: "var(--border-1) solid var(--border-hairline)"
    }
  }, footer) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/** Transient confirmation that drops in from the top edge. */
function Toast({
  message,
  tone = "dark",
  icon,
  onDismiss,
  visible = true
}) {
  if (!visible) return null;
  const tones = {
    dark: {
      background: "var(--carbon-900)",
      color: "var(--cream-50)"
    },
    volt: {
      background: "var(--volt-400)",
      color: "var(--carbon-900)"
    },
    danger: {
      background: "var(--status-danger)",
      color: "#fff"
    }
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-3)",
      padding: "var(--space-3) var(--space-5)",
      borderRadius: "var(--radius-pill)",
      font: "var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)",
      boxShadow: "var(--shadow-lg)",
      animation: "ds-pop-in var(--dur-base) var(--ease-bounce) both",
      ...tones
    }
  }, icon, message, onDismiss ? /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    style: {
      background: "none",
      border: "none",
      color: "inherit",
      cursor: "pointer",
      opacity: 0.7,
      font: "inherit"
    }
  }, "\u2715") : null);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/** Hover label. */
function Tooltip({
  label,
  children,
  side = "top"
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    bottom: {
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    right: {
      left: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    }
  }[side];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex"
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, children, show ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      ...pos,
      whiteSpace: "nowrap",
      zIndex: 40,
      background: "var(--carbon-900)",
      color: "var(--cream-50)",
      padding: "6px var(--space-3)",
      borderRadius: "var(--radius-sm)",
      font: "var(--weight-semibold) var(--text-xs)/1 var(--font-sans)",
      animation: "ds-pop-in var(--dur-fast) var(--ease-bounce) both",
      pointerEvents: "none"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/** Checkbox with a ball-bounce check-in. */
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-3)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: e => onChange?.(e.target.checked),
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      flex: "none",
      display: "grid",
      placeItems: "center",
      borderRadius: "var(--radius-xs)",
      border: "var(--border-2) solid var(--carbon-900)",
      background: checked ? "var(--volt-400)" : "var(--surface-card)",
      transition: "background var(--dur-fast) var(--ease-out)"
    }
  }, checked ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 6,
      borderLeft: "3px solid var(--carbon-900)",
      borderBottom: "3px solid var(--carbon-900)",
      transform: "rotate(-45deg) translate(1px,-2px)",
      animation: "ds-pop-in var(--dur-fast) var(--ease-bounce) both"
    }
  }) : null), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-medium) var(--text-md)/1.3 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text field with an optional label and hint. */
function Input({
  label,
  hint,
  error,
  icon,
  size = "md",
  style,
  ...rest
}) {
  const [f, setF] = React.useState(false);
  const h = {
    sm: "var(--control-h-sm)",
    md: "var(--control-h-md)",
    lg: "var(--control-h-lg)"
  }[size];
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      width: "100%"
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      height: h,
      padding: "0 var(--space-4)",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-md)",
      border: `var(--border-2) solid ${error ? "var(--status-danger)" : f ? "var(--carbon-900)" : "var(--border-hairline)"}`,
      boxShadow: f ? "0 0 0 3px color-mix(in oklab, var(--focus-ring) 30%, transparent)" : "none",
      transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)"
    }
  }, icon, /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    onFocus: e => {
      setF(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setF(false);
      rest.onBlur?.(e);
    },
    style: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      font: "var(--weight-medium) var(--text-md)/1 var(--font-sans)",
      color: "var(--text-body)",
      ...style
    }
  }))), error || hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: `var(--weight-medium) var(--text-xs)/1.4 var(--font-sans)`,
      color: error ? "var(--status-danger)" : "var(--text-muted)"
    }
  }, error || hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
/** Radio whose selected dot is a mini ball. */
function Radio({
  label,
  checked = false,
  onChange,
  name,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-3)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    checked: checked,
    disabled: disabled,
    onChange: () => onChange?.(true),
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 24,
      height: 24,
      flex: "none",
      display: "grid",
      placeItems: "center",
      borderRadius: "50%",
      border: "var(--border-2) solid var(--carbon-900)",
      background: "var(--surface-card)"
    }
  }, checked ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 12,
      borderRadius: "50%",
      background: "var(--volt-400)",
      boxShadow: "inset -2px -2px 4px rgba(10,28,19,0.25)",
      animation: "ds-pop-in var(--dur-fast) var(--ease-bounce) both"
    }
  }) : null), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-medium) var(--text-md)/1.3 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Native select styled to match Input. */
function Select({
  label,
  options = [],
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      width: "100%"
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label) : null, /*#__PURE__*/React.createElement("select", _extends({}, rest, {
    value: value,
    onChange: onChange,
    style: {
      height: "var(--control-h-md)",
      padding: "0 var(--space-4)",
      appearance: "none",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-md)",
      border: "var(--border-2) solid var(--border-hairline)",
      font: "var(--weight-medium) var(--text-md)/1 var(--font-sans)",
      color: "var(--text-body)",
      cursor: "pointer",
      backgroundImage: "linear-gradient(45deg, transparent 50%, var(--carbon-900) 50%), linear-gradient(135deg, var(--carbon-900) 50%, transparent 50%)",
      backgroundPosition: "calc(100% - 18px) 50%, calc(100% - 13px) 50%",
      backgroundSize: "5px 5px, 5px 5px",
      backgroundRepeat: "no-repeat",
      ...style
    }
  }), options.map(o => typeof o === "string" ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
/** Toggle whose knob is a ball; it overshoots slightly as it crosses. */
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--space-3)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange?.(!checked),
    style: {
      width: 56,
      height: 32,
      borderRadius: "var(--radius-pill)",
      padding: 3,
      flex: "none",
      background: checked ? "var(--volt-400)" : "var(--cream-200)",
      border: "var(--border-2) solid var(--carbon-900)",
      display: "flex",
      alignItems: "center",
      transition: "background var(--dur-base) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: checked ? "var(--carbon-900)" : "var(--surface-card)",
      border: "var(--border-1) solid var(--carbon-900)",
      transform: `translateX(${checked ? 24 : 0}px)`,
      transition: "transform var(--dur-base) var(--ease-bounce), background var(--dur-base) var(--ease-out)"
    }
  })), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--weight-medium) var(--text-md)/1.3 var(--font-sans)",
      color: "var(--text-body)"
    }
  }, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/** Underline tabs; the volt indicator slides between items. */
function Tabs({
  items = [],
  value,
  onChange,
  tone = "light"
}) {
  const idx = Math.max(0, items.findIndex(i => (i.value ?? i) === value));
  const dark = tone === "dark";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      gap: "var(--space-6)",
      borderBottom: `var(--border-1) solid ${dark ? "var(--border-dark)" : "var(--border-hairline)"}`
    }
  }, items.map((it, i) => {
    const v = it.value ?? it,
      l = it.label ?? it;
    const active = i === idx;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      onClick: () => onChange?.(v),
      style: {
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "var(--space-3) 0",
        font: `var(--weight-bold) var(--text-sm)/1 var(--font-sans)`,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: active ? dark ? "var(--cream-50)" : "var(--carbon-900)" : dark ? "rgba(255,255,255,0.55)" : "var(--text-muted)",
        transition: "color var(--dur-fast) var(--ease-out)"
      }
    }, l, /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -1,
        height: 3,
        borderRadius: 2,
        background: "var(--volt-400)",
        transformOrigin: "left",
        transform: `scaleX(${active ? 1 : 0})`,
        transition: "transform var(--dur-base) var(--ease-bounce)"
      }
    }));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AppShell.jsx
try { (() => {
const {
  Dialog,
  Toast,
  Button,
  IconButton
} = window.DinkDesignSystem_14cae6;
const NAV = [{
  id: "home",
  label: "Play",
  icon: "flame"
}, {
  id: "book",
  label: "Courts",
  icon: "map-pin"
}, {
  id: "match",
  label: "Live",
  icon: "activity"
}, {
  id: "profile",
  label: "You",
  icon: "user"
}];
function AppShell() {
  const [tab, setTab] = React.useState("home");
  const [joining, setJoining] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const fire = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };
  return /*#__PURE__*/React.createElement(PhoneFrame, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column"
    }
  }, tab === "home" ? /*#__PURE__*/React.createElement(HomeScreen, {
    onJoin: setJoining
  }) : null, tab === "book" ? /*#__PURE__*/React.createElement(BookScreen, {
    onBooked: () => {
      fire("Court 3 booked. 7:00 PM.");
      setTab("home");
    }
  }) : null, tab === "match" ? /*#__PURE__*/React.createElement(MatchScreen, null) : null, tab === "profile" ? /*#__PURE__*/React.createElement(ProfileScreen, null) : null), toast ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 54,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    message: toast,
    tone: "volt"
  })) : null, /*#__PURE__*/React.createElement(Dialog, {
    open: !!joining,
    title: joining ? `Join ${joining.title.toLowerCase()}?` : "",
    onClose: () => setJoining(null),
    width: 320,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      onClick: () => setJoining(null)
    }, "Not now"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: () => {
        fire("You're in. See you at 6.");
        setJoining(null);
      }
    }, "Join"))
  }, joining ? `${joining.court} · ${joining.time} · ${joining.level}. ${joining.spots} spots left at ${joining.price}.` : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      display: "flex",
      background: "var(--carbon-900)",
      padding: "10px 8px 22px"
    }
  }, NAV.map(n => {
    const on = tab === n.id;
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      onClick: () => setTab(n.id),
      style: {
        flex: 1,
        background: "none",
        border: "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "6px 0",
        color: on ? "var(--volt-400)" : "rgba(251,248,239,0.5)",
        transform: on ? "translateY(-2px)" : "none",
        transition: "color var(--dur-fast) var(--ease-out), transform var(--dur-base) var(--ease-bounce)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: n.icon,
      size: 22,
      stroke: on ? 2.5 : 2
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        font: "700 10px/1 var(--font-sans)",
        letterSpacing: "0.1em",
        textTransform: "uppercase"
      }
    }, n.label));
  })));
}
Object.assign(window, {
  AppShell
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/BookScreen.jsx
try { (() => {
const {
  Card,
  Badge,
  Button,
  Select,
  Checkbox,
  Ball
} = window.DinkDesignSystem_14cae6;
const SLOTS = ["5:00", "5:30", "6:00", "6:30", "7:00", "7:30", "8:00", "8:30"];
const TAKEN = ["5:30", "7:30"];
function BookScreen({
  onBooked
}) {
  const [slot, setSlot] = React.useState("7:00");
  const [court, setCourt] = React.useState("Court 3 · Indoor");
  const [gear, setGear] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      paddingBottom: 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "62px 22px 18px",
      background: "var(--surface-sunken)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Gameville Pasig"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "10px 0 0",
      font: "400 36px/0.9 var(--font-display)",
      textTransform: "uppercase"
    }
  }, "Book a court")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "Court",
    options: ["Court 1 · Outdoor", "Court 2 · Outdoor", "Court 3 · Indoor", "Court 4 · Indoor"],
    value: court,
    onChange: e => setCourt(e.target.value)
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      marginBottom: 10
    }
  }, "Start time"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8
    }
  }, SLOTS.map(s => {
    const taken = TAKEN.includes(s),
      on = slot === s;
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      disabled: taken,
      onClick: () => setSlot(s),
      style: {
        height: 46,
        borderRadius: "var(--radius-md)",
        cursor: taken ? "not-allowed" : "pointer",
        font: "700 14px/1 var(--font-mono)",
        opacity: taken ? 0.35 : 1,
        background: on ? "var(--volt-400)" : "var(--surface-card)",
        color: "var(--carbon-900)",
        border: `2px solid ${on ? "var(--carbon-900)" : "var(--border-hairline)"}`,
        boxShadow: on ? "var(--shadow-hard)" : "none",
        transition: "all var(--dur-fast) var(--ease-bounce)"
      }
    }, s);
  }))), /*#__PURE__*/React.createElement(Checkbox, {
    label: "Rent a paddle (\u20B1100)",
    checked: gear,
    onChange: setGear
  }), /*#__PURE__*/React.createElement(Card, {
    tone: "sunken",
    padding: "16px",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 14px/1.4 var(--font-sans)"
    }
  }, court), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 13px/1.4 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, slot, " PM \xB7 90 min", gear ? " · +paddle" : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 22px/1 var(--font-mono)"
    }
  }, "\u20B1", gear ? 700 : 600)), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    size: "lg",
    onClick: onBooked
  }, "Confirm booking"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      color: "var(--text-muted)",
      font: "400 12px/1.5 var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Ball, {
    size: 18,
    animation: "spin"
  }), " Free cancellation up to 2 hours before.")));
}
Object.assign(window, {
  BookScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/BookScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/HomeScreen.jsx
try { (() => {
const {
  Ball,
  Paddle,
  Badge,
  Tag,
  Card,
  Button,
  IconButton,
  Marquee
} = window.DinkDesignSystem_14cae6;
const GAMES = [{
  id: 1,
  title: "Open play",
  court: "Gameville Pasig",
  time: "6:00–9:00 PM",
  level: "3.5+",
  spots: 2,
  live: true,
  price: "₱200"
}, {
  id: 2,
  title: "Ladder night",
  court: "BGC Rooftop Courts",
  time: "7:30 PM",
  level: "4.0+",
  spots: 1,
  live: false,
  price: "₱350"
}, {
  id: 3,
  title: "Beginner clinic",
  court: "Circuit Makati",
  time: "8:00 PM",
  level: "2.5",
  spots: 6,
  live: false,
  price: "₱250"
}];
function HomeScreen({
  onJoin
}) {
  const [filter, setFilter] = React.useState("All levels");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      paddingBottom: 96
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      background: "var(--court-900)",
      color: "var(--cream-50)",
      padding: "62px 22px 26px",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "var(--ball-dots)",
      backgroundSize: "var(--ball-dots-size)",
      opacity: 0.35
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: -18,
      top: 40
    }
  }, /*#__PURE__*/React.createElement(Ball, {
    size: 120,
    animation: "float"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      color: "var(--volt-400)"
    }
  }, "Tuesday \xB7 Pasig"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "10px 0 0",
      font: "400 42px/0.9 var(--font-display)",
      textTransform: "uppercase",
      maxWidth: 200
    }
  }, "Six games", /*#__PURE__*/React.createElement("br", null), "near you"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => onJoin(GAMES[0])
  }, "Play tonight"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    style: {
      color: "var(--cream-50)"
    }
  }, "Invite")))), /*#__PURE__*/React.createElement(Marquee, {
    items: ["2 spots left at Gameville", "Ladder resets Sunday", "New: rooftop courts in BGC"],
    height: 34,
    tone: "volt",
    speed: 16
  }), /*#__PURE__*/React.createElement("div", {
    className: "chiprow",
    style: {
      display: "flex",
      gap: 8,
      padding: "18px 22px 6px",
      overflowX: "auto"
    }
  }, ["All levels", "2.5–3.0", "3.5+", "Indoor", "Tonight"].map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t,
    selected: filter === t,
    onClick: () => setFilter(t)
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: "12px 22px"
    }
  }, GAMES.map(g => /*#__PURE__*/React.createElement(Card, {
    key: g.id,
    interactive: true,
    padding: "16px",
    onClick: () => onJoin(g)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 8
    }
  }, g.live ? /*#__PURE__*/React.createElement(Badge, {
    tone: "live",
    live: true
  }, "Filling up") : null, /*#__PURE__*/React.createElement(Badge, {
    tone: "volt"
  }, g.level)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 26px/0.92 var(--font-display)",
      textTransform: "uppercase"
    }
  }, g.title), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 14px/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, g.court, " \xB7 ", g.time)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 18px/1 var(--font-mono)"
    }
  }, g.price), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 12px/1.4 var(--font-sans)",
      color: "var(--text-muted)",
      marginTop: 6
    }
  }, g.spots, " spots"))))), /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    padding: "18px",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Paddle, {
    size: 54,
    animation: "ready"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 22px/0.95 var(--font-display)",
      textTransform: "uppercase"
    }
  }, "No paddle?"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 13px/1.5 var(--font-sans)",
      opacity: 0.75
    }
  }, "Rent one at the desk for \u20B1100.")))));
}
Object.assign(window, {
  HomeScreen,
  GAMES
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/MatchScreen.jsx
try { (() => {
const {
  ScoreCounter,
  Badge,
  Button,
  Paddle,
  Ball,
  Card
} = window.DinkDesignSystem_14cae6;
function MatchScreen() {
  const [us, setUs] = React.useState(9);
  const [them, setThem] = React.useState(7);
  const [serving, setServing] = React.useState("us");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      background: "var(--court-900)",
      color: "var(--cream-50)",
      paddingBottom: 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      padding: "62px 22px 20px",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "radial-gradient(120% 80% at 50% 0%, rgba(198,232,42,0.18), transparent 60%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "live",
    live: true
  }, "Game 2 \xB7 Live"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 13px/1 var(--font-mono)",
      opacity: 0.7
    }
  }, "Court 3 \xB7 24:18")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 26,
      marginTop: 26
    }
  }, /*#__PURE__*/React.createElement(ScoreCounter, {
    value: us,
    label: "You & Mara"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 30px/1 var(--font-display)",
      opacity: 0.5
    }
  }, "\u2013"), /*#__PURE__*/React.createElement(ScoreCounter, {
    value: them,
    label: "Reyes / Tan",
    tone: "dark"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      justifyContent: "center",
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 16px",
      borderRadius: "var(--radius-pill)",
      background: "var(--glass-dark)",
      backdropFilter: "var(--blur-glass)",
      border: "1px solid var(--border-dark)",
      font: "700 12px/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement(Ball, {
    size: 16,
    animation: "spin"
  }), " ", serving === "us" ? "Your serve" : "Their serve"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      margin: "0 22px",
      height: 168,
      borderRadius: "var(--radius-lg)",
      background: "var(--court-500)",
      border: "2px solid rgba(255,255,255,0.25)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "50%",
      height: 3,
      background: "var(--cream-50)",
      opacity: 0.85
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "50%",
      top: 0,
      bottom: 0,
      width: 2,
      background: "var(--cream-50)",
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "32%",
      height: "36%",
      background: "rgba(242,89,31,0.22)",
      borderTop: "2px solid rgba(251,248,239,0.6)",
      borderBottom: "2px solid rgba(251,248,239,0.6)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "50%",
      top: 18,
      transform: "translateX(-50%)"
    }
  }, /*#__PURE__*/React.createElement(Ball, {
    size: 22,
    animation: "bounce"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 14,
      bottom: 10
    }
  }, /*#__PURE__*/React.createElement(Paddle, {
    size: 44,
    animation: "swing"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      padding: "20px 22px 12px"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    onClick: () => {
      setUs(u => u + 1);
      setServing("us");
    }
  }, "+1 us"), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    variant: "secondary",
    onClick: () => {
      setThem(t => t + 1);
      setServing("them");
    }
  }, "+1 them")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 22px"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "dark",
    padding: "16px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      opacity: 0.6,
      marginBottom: 10
    }
  }, "This game"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      font: "400 14px/2 var(--font-mono)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Longest rally"), /*#__PURE__*/React.createElement("span", null, "17 shots")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      font: "400 14px/2 var(--font-mono)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Dinks won"), /*#__PURE__*/React.createElement("span", null, "68%")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      font: "400 14px/2 var(--font-mono)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Unforced errors"), /*#__PURE__*/React.createElement("span", null, "4")))));
}
Object.assign(window, {
  MatchScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/MatchScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ProfileScreen.jsx
try { (() => {
const {
  Card,
  Badge,
  Switch,
  Tabs,
  Ball,
  Button
} = window.DinkDesignSystem_14cae6;
function ProfileScreen() {
  const [tab, setTab] = React.useState("Stats");
  const [alerts, setAlerts] = React.useState(true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      paddingBottom: 110
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      padding: "62px 22px 24px",
      background: "var(--volt-400)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "var(--ball-dots)",
      backgroundSize: "var(--ball-dots-size)",
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: "50%",
      background: "var(--carbon-900)",
      color: "var(--volt-400)",
      display: "grid",
      placeItems: "center",
      font: "400 30px/1 var(--font-display)"
    }
  }, "MV"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 30px/0.92 var(--font-display)",
      textTransform: "uppercase"
    }
  }, "Mara Villanueva"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "dark"
  }, "4.25 DUPR"), /*#__PURE__*/React.createElement(Badge, {
    tone: "dark"
  }, "Pasig"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 22px 0"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    items: ["Stats", "History", "Settings"],
    value: tab,
    onChange: setTab
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, tab === "Stats" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, [["48", "Games played"], ["31", "Wins"], ["17", "Longest rally"], ["+0.35", "Rating change"]].map(([n, l]) => /*#__PURE__*/React.createElement(Card, {
    key: l,
    padding: "16px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 30px/1 var(--font-mono)"
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--label-weight) 11px/1.4 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      marginTop: 6
    }
  }, l)))) : tab === "History" ? [["Won 11–7", "vs Reyes / Tan", "Yesterday"], ["Lost 8–11", "vs Cruz / Lim", "Sat"], ["Won 11–4", "vs Dela Peña / Yu", "Thu"]].map(([r, o, d]) => /*#__PURE__*/React.createElement(Card, {
    key: d,
    padding: "14px 16px",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 15px/1.3 var(--font-sans)",
      color: r.startsWith("Won") ? "var(--volt-600)" : "var(--text-body)"
    }
  }, r), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 13px/1.4 var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, o)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "400 12px/1 var(--font-mono)",
      color: "var(--text-muted)"
    }
  }, d))) : /*#__PURE__*/React.createElement(Card, {
    padding: "18px",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    label: "Match alerts",
    checked: alerts,
    onChange: setAlerts
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "Show my rating publicly",
    checked: false,
    onChange: () => {}
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    fullWidth: true
  }, "Sign out")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      color: "var(--text-muted)",
      font: "400 12px/1.5 var(--font-sans)",
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement(Ball, {
    size: 16,
    animation: "float"
  }), " Ratings update within an hour of your last game.")));
}
Object.assign(window, {
  ProfileScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ProfileScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/kit-utils.jsx
try { (() => {
/* Shared helpers for the UI kits: Lucide icon renderer + phone chrome. */
const _iconCache = {};
function Icon({
  name,
  size = 20,
  stroke = 2,
  style
}) {
  const key = name.split("-").map(p => p[0].toUpperCase() + p.slice(1)).join("");
  if (!_iconCache[key]) {
    const entry = window.lucide && (window.lucide.icons?.[key] || window.lucide[key]) || null;
    const node = entry && entry[2] || [];
    _iconCache[key] = node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")} />`).join("");
  }
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      display: "block",
      flex: "none",
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: _iconCache[key]
    }
  });
}
function PhoneFrame({
  children,
  width = 390,
  height = 844
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 44,
      background: "var(--carbon-900)",
      padding: 10,
      boxShadow: "var(--shadow-lg)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "screen",
    style: {
      position: "relative",
      width: "100%",
      height: "100%",
      borderRadius: 36,
      overflow: "hidden",
      background: "var(--bg-page)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 46,
      zIndex: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      font: "var(--weight-bold) 13px/1 var(--font-sans)",
      color: "inherit",
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "signal",
    size: 14
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "wifi",
    size: 14
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "battery-full",
    size: 14
  }))), children));
}
Object.assign(window, {
  Icon,
  PhoneFrame
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/kit-utils.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/HomePage.jsx
try { (() => {
const {
  Button,
  Badge,
  Card,
  Ball,
  Paddle,
  Marquee,
  Tag,
  Input
} = window.DinkDesignSystem_14cae6;
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      background: "var(--court-900)",
      color: "var(--cream-50)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "radial-gradient(90% 70% at 78% 20%, rgba(198,232,42,0.22), transparent 65%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "var(--ball-dots)",
      backgroundSize: "var(--ball-dots-size)",
      opacity: 0.25
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: "var(--max-content)",
      margin: "0 auto",
      padding: "88px var(--gutter-page-lg) 96px",
      display: "grid",
      gridTemplateColumns: "1.1fr 0.9fr",
      gap: 40,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Badge, {
    tone: "volt"
  }, "Open play every night"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "22px 0 0",
      font: "400 var(--display-xl)/var(--display-leading) var(--font-display)",
      textTransform: "uppercase"
    }
  }, "Play more.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--volt-400)"
    }
  }, "Enjoy more.")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "22px 0 0",
      font: "400 var(--text-lg)/var(--text-leading) var(--font-sans)",
      maxWidth: "46ch",
      opacity: 0.82
    }
  }, "Find a court, join a game at your level, and keep score without leaving the app. Six hundred players, forty courts, one very loud yellow ball."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg"
  }, "Find a game"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "ghost",
    style: {
      color: "var(--cream-50)",
      border: "2px solid rgba(255,255,255,0.3)"
    }
  }, "Watch a rally")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 36,
      marginTop: 44
    }
  }, [["612", "Players"], ["40", "Courts"], ["9.8k", "Games played"]].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 var(--data-lg)/1 var(--font-mono)",
      color: "var(--volt-400)"
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      opacity: 0.65,
      marginTop: 8
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 420,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: 320,
      height: 320,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(198,232,42,0.22), transparent 65%)"
    }
  }), /*#__PURE__*/React.createElement(Paddle, {
    size: 210,
    animation: "swing",
    label: "Dink"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 24,
      top: 60
    }
  }, /*#__PURE__*/React.createElement(Ball, {
    size: 86,
    animation: "bounce",
    shadow: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 12,
      bottom: 40
    }
  }, /*#__PURE__*/React.createElement(Ball, {
    size: 46,
    animation: "float"
  })))));
}
function Features() {
  const items = [["zap", "Matched by level", "Every game lists a rating band, so you never turn up to the wrong court."], ["map-pin", "Courts near you", "Forty indoor and outdoor courts across Metro Manila, with live availability."], ["trophy", "Ladders & leagues", "Weekly ladder nights that reset every Sunday. Climb, or get dinked."], ["shopping-bag", "Paddles that last", "Raw carbon faces, honeycomb cores, and a cover in every box."]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: "var(--max-content)",
      margin: "0 auto",
      padding: "88px var(--gutter-page-lg)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: "400 var(--display-md)/var(--display-leading) var(--font-display)",
      textTransform: "uppercase"
    }
  }, "One paddle.", /*#__PURE__*/React.createElement("br", null), "Endless possibilities."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 20,
      marginTop: 40
    }
  }, items.map(([icon, title, body]) => /*#__PURE__*/React.createElement(Card, {
    key: title,
    interactive: true,
    padding: "24px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "var(--radius-md)",
      background: "var(--volt-400)",
      border: "2px solid var(--carbon-900)",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 24px/0.95 var(--font-display)",
      textTransform: "uppercase",
      marginTop: 18
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px 0 0",
      font: "400 var(--text-sm)/var(--text-leading) var(--font-sans)",
      color: "var(--text-muted)"
    }
  }, body)))));
}
function CourtFinder() {
  const [f, setF] = React.useState("Tonight");
  const courts = [["Gameville Pasig", "Indoor · 6 courts", "2 slots tonight", "₱200"], ["BGC Rooftop", "Outdoor · 4 courts", "Fully booked", "₱350"], ["Circuit Makati", "Indoor · 8 courts", "5 slots tonight", "₱250"]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-sunken)",
      borderTop: "1px solid var(--border-hairline)",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--max-content)",
      margin: "0 auto",
      padding: "72px var(--gutter-page-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      gap: 24,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: "400 var(--display-md)/var(--display-leading) var(--font-display)",
      textTransform: "uppercase"
    }
  }, "Courts near you"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, ["Tonight", "Weekend", "Indoor", "Outdoor"].map(t => /*#__PURE__*/React.createElement(Tag, {
    key: t,
    selected: f === t,
    onClick: () => setF(t)
  }, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20,
      marginTop: 32
    }
  }, courts.map(([name, meta, avail, price]) => /*#__PURE__*/React.createElement(Card, {
    key: name,
    interactive: true,
    padding: "0",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 132,
      background: "linear-gradient(160deg, var(--court-500), var(--court-900))",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: "18% 12%",
      border: "2px solid rgba(251,248,239,0.55)",
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "50%",
      height: 2,
      background: "rgba(251,248,239,0.55)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 14,
      bottom: 12
    }
  }, /*#__PURE__*/React.createElement(Ball, {
    size: 26,
    animation: "float"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 24px/0.95 var(--font-display)",
      textTransform: "uppercase"
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "500 var(--text-sm)/1.5 var(--font-sans)",
      color: "var(--text-muted)",
      marginTop: 6
    }
  }, meta), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: avail.startsWith("Fully") ? "neutral" : "volt"
  }, avail), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 16px/1 var(--font-mono)"
    }
  }, price))))))));
}
function CTA() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: "var(--max-content)",
      margin: "0 auto",
      padding: "88px var(--gutter-page-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      background: "var(--volt-400)",
      border: "3px solid var(--carbon-900)",
      borderRadius: "var(--radius-xl)",
      padding: "56px 48px",
      overflow: "hidden",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: "var(--ball-dots)",
      backgroundSize: "var(--ball-dots-size)",
      opacity: 0.35
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: "400 var(--display-lg)/var(--display-leading) var(--font-display)",
      textTransform: "uppercase"
    }
  }, "Gameday", /*#__PURE__*/React.createElement("br", null), "starts tonight."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "16px 0 0",
      font: "500 var(--text-lg)/1.5 var(--font-sans)",
      maxWidth: "40ch"
    }
  }, "Open play, 6:00\u20139:00 PM. \u20B1200 a player. Paddles available at the desk."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg"
  }, "Reserve a spot"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Ball, {
    size: 150,
    animation: "bounce",
    shadow: true
  }))));
}
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--carbon-900)",
      color: "var(--cream-50)"
    }
  }, /*#__PURE__*/React.createElement(Marquee, {
    items: ["Open play 6–9pm", "Ladder night Thursdays", "Rentals available", "Dink responsibly"],
    tone: "volt",
    height: 48
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--max-content)",
      margin: "0 auto",
      padding: "56px var(--gutter-page-lg)",
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 34px/1 var(--font-display)",
      textTransform: "uppercase"
    }
  }, "Dink", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--volt-400)"
    }
  }, ".")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "14px 0 0",
      font: "400 var(--text-sm)/1.6 var(--font-sans)",
      opacity: 0.6,
      maxWidth: "34ch"
    }
  }, "Courts, games and gear for players at every level.")), [["Play", ["Open play", "Ladders", "Lessons", "Tournaments"]], ["Shop", ["Paddles", "Balls", "Covers", "Apparel"]], ["Company", ["About", "Careers", "Contact", "Press"]]].map(([h, links]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
      letterSpacing: "var(--label-tracking)",
      textTransform: "uppercase",
      color: "var(--volt-400)"
    }
  }, h), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginTop: 16
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      font: "400 var(--text-sm)/1 var(--font-sans)",
      color: "var(--cream-50)",
      opacity: 0.7,
      textDecoration: "none"
    }
  }, l)))))));
}
function HomePage() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--bg-page)"
    }
  }, /*#__PURE__*/React.createElement(SiteHeader, null), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Features, null), /*#__PURE__*/React.createElement(CourtFinder, null), /*#__PURE__*/React.createElement(CTA, null), /*#__PURE__*/React.createElement(SiteFooter, null));
}
Object.assign(window, {
  Hero,
  Features,
  CourtFinder,
  CTA,
  SiteFooter,
  HomePage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/HomePage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/SiteHeader.jsx
try { (() => {
const {
  Button,
  IconButton,
  Badge,
  Marquee
} = window.DinkDesignSystem_14cae6;
function SiteHeader() {
  const [open, setOpen] = React.useState("");
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 40,
      background: "var(--glass-light)",
      backdropFilter: "var(--blur-glass)",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--max-content)",
      margin: "0 auto",
      padding: "0 var(--gutter-page-lg)",
      height: 72,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      font: "400 30px/1 var(--font-display)",
      textTransform: "uppercase",
      textDecoration: "none",
      color: "var(--carbon-900)"
    }
  }, "Dink", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--volt-500)"
    }
  }, ".")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 28,
      flex: 1
    }
  }, ["Play", "Courts", "Paddles", "Leagues"].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onMouseEnter: () => setOpen(l),
    onMouseLeave: () => setOpen(""),
    style: {
      font: "700 13px/1 var(--font-sans)",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      textDecoration: "none",
      color: open === l ? "var(--volt-600)" : "var(--carbon-900)",
      transition: "color var(--dur-fast) var(--ease-out)"
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    label: "Search",
    variant: "ghost"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 20
  })), /*#__PURE__*/React.createElement(Button, {
    size: "sm"
  }, "Find a game"))));
}
Object.assign(window, {
  SiteHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/SiteHeader.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Ball = __ds_scope.Ball;

__ds_ns.Marquee = __ds_scope.Marquee;

__ds_ns.Paddle = __ds_scope.Paddle;

__ds_ns.RallyLoader = __ds_scope.RallyLoader;

__ds_ns.ScoreCounter = __ds_scope.ScoreCounter;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();

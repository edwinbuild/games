const R = window.React
const make = (type, props, key) => R.createElement(type, key === undefined ? props : { ...props, key })
export const jsx = make
export const jsxs = make
export const Fragment = R.Fragment

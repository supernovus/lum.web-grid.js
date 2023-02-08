/**
 * The Web Grid class with pre-defined conflict resolvers added.
 * @module module:@lumjs/web-grid
 * @see module:@lumjs/web-grid/grid
 * @see module:@lumjs/grid/resolvers
 */

const WebGrid = require('./grid');
require('@lumjs/grid/resolvers').registerAll(WebGrid);
module.exports = WebGrid;

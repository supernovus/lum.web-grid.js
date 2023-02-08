const core = require('@lumjs/core');
const {def,isObj,B} = core.types;
const Grid = require('@lumjs/grid/grid');

/**
 * An extension of the Grid library with extra features for dealing with
 * DOM elements and events, for rendering a grid on a web page.
 *
 * @exports module:@lumjs/web-grid/grid
 * @extends module:@lumjs/grid/grid
 */
class WebGrid extends Grid
{
  constructor (options={}, defs={})
  {
    // Apply our settings.
    defs.displayWidth  = 0;      // Width of the display area.
    defs.displayHeight = 0;      // Height of the display area.
    defs.cellWidth     = 0;      // Width of a single 'cell'.
    defs.cellHeight    = 0;      // Height of a single 'cell'.
    defs.resizeMaxRows = false;  // If displayHeight changes. update maxRows.
    defs.resizeMaxCols = false;  // If displayWidth changes, update maxCols.

    // Call our parent constructor.
    super(options, defs);

    this._copySettings.push('displayElement');

    // We can also apply displayWidth/displayHeight from a DOM element.
    if ('displayElement' in options)
    {
      this.setDisplayElement(options.displayElement, options);
    }

    // And add some event handlers to rebuild the display.
    this.on('changed', function (item, options)
    {
      this.buildDisplay();
    });
  }

  setDisplayElement (displayElem, options)
  {
    if (!displayElem && !this.settings.displayElement) return;
    if (!displayElem)
      displayElem = this.settings.displayElement;
    //console.debug("setDisplayElement", displayElem);
    options = options || {};
    const set = this.settings;
    set.displayElement = displayElem;
    set.displayWidth = displayElem.offsetWidth;
    set.displayHeight = displayElem.offsetHeight;
    const cellElem = options.cellElement;
    if (cellElem)
    {
      set.cellWidth = cellElem.offsetWidth;
      set.cellHeight = cellElem.offsetHeight;
    }
    //console.debug("setDisplayElement", set, options, displayElem);
    let regen = false;
    if (set.resizeMaxRows && set.displayHeight && set.cellHeight)
    {
      set.maxRows = Math.floor(set.displayHeight / set.cellHeight);
      regen = true;
    }
    if (set.resizeMaxCols && set.displayWidth && set.cellWidth)
    {
      set.maxCols = Math.floor(set.displayWidth / set.cellWidth);
      regen = true;
    }

    if (regen && this.items.length > 0)
    {
      this.buildGrid();
    }

    let rebuild = options.rebuildDisplay;
    if (rebuild === undefined && this.items.length > 0)
      rebuild = true;
    if (rebuild)
    { // Rebuild the display.
      this.buildDisplay();
    }

    //console.debug("set display element", displayElem, cellElem, set, regen, rebuild);
  }

  clone ()
  {
    const clone = super.clone();
    if (clone.items.length > 0)
    {
      clone.buildDisplay();
    }
    return clone;
  }

  buildDisplay ()
  {
    this.trigger('preBuildDisplay');
    this.display = [];
    const set = this.settings;
    const cw = set.cellWidth;
    const ch = set.cellHeight;
    for (let i = 0; i < this.items.length; i++)
    {
      const gitem = this.items[i];
      const ditem = 
      {
        x: gitem.x * cw,
        y: gitem.y * ch,
        w: gitem.w * cw,
        h: gitem.h * ch,
      };
      def(ditem, 'gridItem',    gitem);
      def(gitem, 'displayItem', ditem);
      this.display.push(ditem);
      this.trigger('buildDisplayItem', ditem);
    }
    this.trigger('postBuildDisplay');
  }

  getCursorPos (e)
  {
    if ( e.pageX === undefined 
      || e.pageY === undefined 
      || e.currentTarget === undefined)
    {
      if (e.originalTarget)
      {
        return this.getCursorPos(e.originalTarget);
      }
      else
      {
        console.error("Could not find required event properties.");
        return null;
      }
    }
    const y = e.pageY - e.currentTarget.offsetTop;
    const x = e.pageX - e.currentTarget.offsetLeft;
    return {x: x, y: y};
  }

  displayPos (pos)
  {
    if (!isObj(pos)) return false;
    if (pos.originalTarget !== undefined 
      || (pos.pageY !== undefined 
        && pos.pageX !== undefined 
        && pos.currentTarget !== undefined))
    { // It's an event, convert it to a pos.
      pos = this.getCursorPos(pos);
      if (!isObj(pos)) return false;
    }
    if (pos.x === undefined || pos.y === undefined)
    { // No coordinates, cannot continue.
      return false;
    }

    // Generate a simplistic grid position value.
    const cw = this.settings.cellWidth;
    const ch = this.settings.cellHeight;
    const drow = (pos.y ? Math.floor(pos.y / ch) : 0);
    const dcol = (pos.x ? Math.floor(pos.x / cw) : 0);

    return {pos: {x: dcol, y: drow}};
  }

  displayItemFits (pos, dim, isGpos)
  {
    let gpos;
    const cr = this.getConflictResolution();
    
    if (isGpos)
    {
      gpos = {pos:{x:0, y:0}};
      if (pos.x !== undefined)
        gpos.pos.x = pos.x;
      if (pos.y !== undefined)
        gpos.pos.y = pos.y;
    }
    else
    {
      gpos = this.displayPos(pos);
    }

    if (!gpos)
    { // It failed, pass through the failure.
      return gpos;
    }

    const testpos = {x: gpos.pos.x, y: gpos.pos.y};
    if (dim !== undefined && dim.h !== undefined)
    {
      testpos.h = dim.h;
    }
    else
    {
      testpos.h = 1;
    }
    if (dim !== undefined && dim.w !== undefined)
    {
      testpos.w = dim.w;
    }
    else
    {
      testpos.w = 1;
    }

    if (dim !== undefined && dim.id !== undefined)
    {
      testpos.id = dim.id;
    }
    else if (pos.id !== undefined)
    {
      testpos.id = pos.id;
    }

    const fits = this.itemFits(testpos);
    if (typeof fits === B)
    { // Return value is if the item fits, no conflicts detected.
      gpos.fits = fits;
      gpos.conflicts = [];
    }
    else
    { // Return value is a list of conflicts, obvious the item doesn't fit.
      gpos.fits = (cr && cr.addFirst);
      gpos.conflicts = fits;
    }

    // Return what we found.
    return gpos;

  } // displayItemFits()

} // class WebGrid

module.exports = WebGrid;

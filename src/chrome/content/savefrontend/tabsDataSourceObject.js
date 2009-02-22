/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Archive Format.
 *
 * The Initial Developer of the Original Code is
 * Paolo Amadini <http://www.amadzone.org/>.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Provides an RDF data source that represents the tabs available in browser
 *  windows. For each tab, a selection state is available, and the list of
 *  selected tabs can be retrieved.
 *
 * For general information about RDF data sources in Mozilla, see
 *  <https://developer.mozilla.org/en/RDF_in_Mozilla_FAQ> (retrieved
 *  2009-02-22). For more information on RDF data source implementation
 *  techniques, see <https://developer.mozilla.org/en/RDF_Datasource_How-To>
 *  (retrieved 2009-02-22).
 *
 * @param aBrowserWindow   Browser window object whose tabs will be available
 *                          for selection.
 */
function TabsDataSource(aBrowserWindow) {
  // This object implements the nsIRDFDataSource interface by forwarding most
  //  of the calls to an in-memory data source. The first part of the
  //  initialization consists in creating the wrapper functions.

  // Create an empty in-memory data source to hold the data
  var wrappedObject =
   Cc["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"]
   .createInstance(Ci.nsIRDFDataSource);

  // This function creates a forwarding function for wrappedObject
  function makeForwardingFunction(functionName) {
    return function() {
      return wrappedObject[functionName].apply(wrappedObject, arguments);
    }
  }

  // Forward all the functions that are not explicitly overridden
  for (var propertyName in wrappedObject) {
    if (typeof wrappedObject[propertyName] == "function" &&
     !(propertyName in this)) {
      this[propertyName] = makeForwardingFunction(propertyName);
    }
  }

  // We also set up a convenience access to some of the RDF resource objects
  //  that are commonly used with this data source. This way, users don't need
  //  to call GetResource repeatedly.
  for (var resourceId in this.resources) {
    if (this.resources.hasOwnProperty(resourceId)) {
      var resource = this.resources[resourceId];
      // Since the inner "resources" object is stored in the prototype, it is
      //  shared by all the instances of the data source created from the same
      //  prototype, and the translation from URL to RDF resource may have been
      //  already done.
      if (typeof resource == "string") {
        this.resources[resourceId] = this._rdf.GetResource(resource);
      }
    }
  }

  // Store a reference to the wrapped object and initialize the actual data
  this._wrappedObject = wrappedObject;
  this._browsers = [];
  this._createDataFromWindow(aBrowserWindow);
}

TabsDataSource.prototype = {

  // --- Public methods and properties ---

  /**
   * Collection of RDF resource objects that form the common subjects and the
   *  vocabulary of this RDF data source.
   *
   * Note: The strings are converted to actual RDF resources as soon as this
   *  data source is constructed, so GetResource must not be called. The
   *  original resource URL can be retrieved using the ValueUTF8 property of
   *  the resource object.
   */
  resources: {
    // Subjects and objects
    root:      "urn:root",
    windows:   "urn:maf:windows",
    window:    "urn:maf:window",
    // Standard predicates
    instanceOf:   "http://www.w3.org/1999/02/22-rdf-syntax-ns#instanceOf",
    child:        "http://home.netscape.com/NC-rdf#child",
    // Custom predicates
    internalIndex:   "urn:maf:vocabulary#internalIndex",
    title:           "urn:maf:vocabulary#title",
    originalUrl:     "urn:maf:vocabulary#originalUrl",
    checked:         "urn:maf:vocabulary#checked"
  },

  /**
   * Getter for an RDF resource representing a window.
   */
  resourceForWindow: function(aIndex) {
    return this._rdf.GetResource("urn:maf:window#" + aIndex);
  },

  /**
   * Getter for an RDF resource representing a tab.
   */
  resourceForTab: function(aIndex) {
    return this._rdf.GetResource("urn:maf:tab#" + aIndex);
  },

  // --- nsISupports interface functions ---

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIRDFDataSource]),

  // --- nsIRDFDataSource interface functions ---

  Assert: function(aSource, aProperty, aTarget, aTruthValue) {
    // Should return NS_RDF_ASSERTION_REJECTED, but it is a success code
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  Change: function(aSource, aProperty, aOldTarget, aNewTarget) {
    // Only allow changing the "checked" property
    if (aProperty != this.resources.checked) {
      // Should return NS_RDF_ASSERTION_REJECTED, but it is a success code
      throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    }

    // Propagate the change to the wrapped object
    this._wrappedObject.Change(aSource, aProperty, aOldTarget, aNewTarget);
  },

  Move: function(aOldSource, aNewSource, aProperty, aTarget) {
    // Should return NS_RDF_ASSERTION_REJECTED, but it is a success code
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  Unassert: function(aSource, aProperty, aTarget) {
    // Should return NS_RDF_ASSERTION_REJECTED, but it is a success code
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  // --- Private methods and properties ---

  /**
   * Populates the data source with the actual data derived from the open tabs
   *  in the provided window.
   *
   * This is the tree-like structure of the RDF data:
   *
   *   *** [urn:root] ***
   *   |
   *   +- http://www.w3.org/1999/02/22-rdf-syntax-ns#instanceOf
   *   |  > [urn:root]
   *   |
   *   +- http://home.netscape.com/NC-rdf#child
   *      > *** [urn:maf:windows] ***
   *        |
   *        +- http://www.w3.org/1999/02/22-rdf-syntax-ns#instanceOf
   *        |  > [urn:maf:windows]
   *        |
   *        +- urn:maf:vocabulary#Title
   *        |  > nsIRDFLiteral (for example "Window title")
   *        |
   *        +- urn:maf:vocabulary#Checked
   *        |  > nsIRDFLiteral ("true" or "false")
   *        |
   *        +- <sequence member>
   *           > *** [urn:maf:window#<...>] ***
   *             |
   *             +- http://www.w3.org/1999/02/22-rdf-syntax-ns#instanceOf
   *             |  > [urn:maf:window]
   *             |
   *             +- urn:maf:vocabulary#Checked
   *             |  > nsIRDFLiteral ("true" or "false")
   *             |
   *             +- <sequence member>
   *                > *** [urn:maf:tab#<...>] ***
   *                  |
   *                  +- urn:maf:vocabulary#InternalIndex
   *                  |  > nsIRDFInt
   *                  |
   *                  +- urn:maf:vocabulary#Title
   *                  |  > nsIRDFLiteral (for example "Page title")
   *                  |
   *                  +- urn:maf:vocabulary#OriginalURL
   *                  |  > nsIRDFLiteral (for example "http://...")
   *                  |
   *                  +- urn:maf:vocabulary#Checked
   *                     > nsIRDFLiteral ("true" or "false")
   *
   * Legend:
   *
   *   *** [SUBJECT RESOURCE URL] *** (<...> = variable part of the URL)
   *   |
   *   +- PREDICATE RESOURCE URL
   *   |   > [OBJECT RESOURCE URL]
   *   |
   *   +- PREDICATE RESOURCE URL
   *       > Object interface type (with examples or description)
   *
   */
  _createDataFromWindow: function(aBrowserWindow) {
    // Shorthand for objects commonly used throughout this function
    var ds = this._wrappedObject;
    var res = this.resources;

    // Create the root of the tree, that has a single child pointing to the
    //  list of windows. This is required for properly handling the recursive
    //  XUL template generation that is used to create XUL trees.
    ds.Assert(res.root, res.instanceOf, res.root, true);
    ds.Assert(res.root, res.child, res.windows, true);

    // Create the "windows" resource, which is an RDF container of windows
    var windowsSequence = this._rdfSequence(res.windows);
    ds.Assert(res.windows, res.instanceOf, res.windows, true);

    // Set additional properties of the "windows" resource 
    ds.Assert(res.windows, res.checked, this._rdfBool(false), true);

    // Create the "window" resource, which is an RDF container of tabs, and
    //  add it to the parent container
    var windowResource = this.resourceForWindow(1);
    var windowSequence = this._rdfSequence(windowResource);
    ds.Assert(windowResource, res.instanceOf, res.window, true);
    windowsSequence.AppendElement(windowResource);

    // Set additional properties of the "window" resource 
    ds.Assert(windowResource, res.title,
     this._rdf.GetLiteral(aBrowserWindow.document.title), true);
    ds.Assert(windowResource, res.checked, this._rdfBool(false), true);

    // For each tab that is available
    var browsers = aBrowserWindow.getBrowser().browsers;
    for (var i = 0; i < browsers.length; i++) {
      // Copy the browser object reference to the internal array
      this._browsers.push(browsers[i]);

      // Create the "tab" resource and add it to the parent container
      var tabResource = this.resourceForTab(i + 1);
      windowSequence.AppendElement(tabResource);

      // Set the internal index in the array as an RDF integer
      ds.Assert(tabResource, res.internalIndex,
       this._rdf.GetIntLiteral(this._browsers.length - 1), true);

      // Set the tab label as an RDF literal. The actual label displayed in the
      //  user interface is shown, which is not necessarily the page title.
      var tabTitle = aBrowserWindow.getBrowser().mTabs[i].label;
      ds.Assert(tabResource, res.title,
       this._rdf.GetLiteral(tabTitle), true);

      // Set the original URL of the document as an RDF literal
      var pageUrl = browsers[i].contentDocument.location.href;
      ds.Assert(tabResource, res.originalUrl,
       this._rdf.GetLiteral(pageUrl), true);

      // Add the checked state
      ds.Assert(tabResource, res.checked, this._rdfBool(false), true);
    }
  },

  /**
   * Return an RDF literal containing either "true" or "false".
   */
  _rdfBool: function(aBooleanValue) {
    return this._rdf.GetLiteral(aBooleanValue ? "true" : "false");
  },

  /**
   * Make an RDF sequence associated with the wrapped data source.
   */
  _rdfSequence: function(aResource) {
    return Cc["@mozilla.org/rdf/container-utils;1"]
     .getService(Ci.nsIRDFContainerUtils).MakeSeq(this._wrappedObject,
     aResource);
  },

  /**
   * Actual browser objects associated with this data source.
   */
  _browsers: [],

  /**
   * In-memory RDF data source that is wrapped by this object.
   */
  _wrappedObject: null,

  _rdf: Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService)
}
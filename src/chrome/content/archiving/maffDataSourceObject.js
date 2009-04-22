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

// Import XPCOMUtils to generate the QueryInterface functions
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

/**
 * Provides an RDF data source that gives access to the files containing the
 *  saved page metadata of MAFF archives, both for reading and for writing.
 *
 * For general information about RDF data sources in Mozilla, see
 *  <https://developer.mozilla.org/en/RDF_in_Mozilla_FAQ> (retrieved
 *  2009-02-22). For more information on RDF data source implementation
 *  techniques, see <https://developer.mozilla.org/en/RDF_Datasource_How-To>
 *  (retrieved 2009-02-22).
 */
function MaffDataSource() {
  // This object implements the nsIRDFDataSource interface by forwarding most
  //  of the calls to an XML data source. The first part of the initialization
  //  consists in creating the wrapper functions.

  // Create an empty in-memory XML data source to hold the data
  var wrappedObject =
   Cc["@mozilla.org/rdf/datasource;1?name=xml-datasource"].
   createInstance(Ci.nsIRDFDataSource);

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

  // Store a reference to the wrapped object
  this._wrappedObject = wrappedObject;
}

MaffDataSource.prototype = {

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
    root:   "urn:root",
    // Custom predicates
    title:           "http://maf.mozdev.org/metadata/rdf#title",
    originalUrl:     "http://maf.mozdev.org/metadata/rdf#originalurl",
    archiveTime:     "http://maf.mozdev.org/metadata/rdf#archivetime",
    indexFileName:   "http://maf.mozdev.org/metadata/rdf#indexfilename",
    charset:         "http://maf.mozdev.org/metadata/rdf#charset"
  },

  /**
   * Getter for an RDF resource representing a predicate in the MAF namespace.
   */
  resourceForProperty: function(aPropertyName) {
    return this._rdf.GetResource(this._mafNamespacePrefix + aPropertyName);
  },

  /**
   * Prepares the data source for receiving new data that will be saved later.
   *
   * This method may not be called if the data will be loaded from a file.
   */
  init: function() {
    // Before saving the data source into an RDF/XML file, we need to add the
    //  proper XML namespace for the resources in the MAF vocabulary. Since the
    //  addNameSpace method of the nsIRDFXMLSink interface is not scriptable, we
    //  can only reach it by parsing an existing XML file into the data source.
    //  The file is generated in memory from an empty data source, then it is
    //  fed to an XML parser that drives the real data source.
    this._feedString(this._getMafNamespaceXml());
  },

  /**
   * Loads the data from the specified RDF file.
   */
  loadFromFile: function(aFile) {
    // Since in the RDF files of the MAFF format some literals are persisted as
    //  RDF resource URLs, we must use a custom RDF/XML parser to prevent the
    //  default parser from trying to resolve the literals as relative URLs.
    var fileContents = this._readEntireFile(aFile, "UTF-8");
    this._feedString(fileContents);
  },

  /**
   * Saves the data into the specified RDF file.
   */
  saveToFile: function(aFile) {
    var fileUrl = Cc["@mozilla.org/network/io-service;1"].
     getService(Ci.nsIIOService).newFileURI(aFile);
    this._wrappedObject.QueryInterface(Ci.nsIRDFRemoteDataSource).
     FlushTo(fileUrl.spec);
  },

  /**
   * Retrieve a string representing the value of the provided property, or a
   *  value that evaluates to false if the property is missing or empty.
   */
  getMafProperty: function(aPredicate) {
    // Get the target of the provided predicate, or null if missing
    var target = this._wrappedObject.
     GetTarget(this.resources.root, aPredicate, true);
    // In RDF files of MAFF archives, values are stored as resources
    return target && target.QueryInterface(Ci.nsIRDFResource).ValueUTF8;
  },

  /**
   * Set the value of the provided property.
   */
  setMafProperty: function(aPredicate, aValue) {
    // For MAFF format compatibility, store the value as an RDF resource
    var valueRes = this._rdf.GetResource(aValue);
    // Store the value as the target of the provided predicate
    this._wrappedObject.Assert(this.resources.root, aPredicate, valueRes, true);
  },

  // --- nsISupports interface functions ---

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIRDFDataSource]),

  // --- Private methods and properties ---

  /**
   * Namespace prefix for MAF resource URLs.
   */
  _mafNamespacePrefix: "http://maf.mozdev.org/metadata/rdf#",

  /**
   * Name for the MAF namespace in RDF/XML files.
   */
  _mafNamespaceName: "MAF",

  /**
   * Returns a string with the contents of the provided nsIFile, read using the
   *  specified encoding. An exception will be raised if any character in the
   *  file is not encoded properly.
   */
  _readEntireFile: function(aFile, aEncoding) {
    // Create and initialize an input stream to read from the provided file
    var inputStream = Cc["@mozilla.org/network/file-input-stream;1"].
     createInstance(Ci.nsIFileInputStream);
    inputStream.init(aFile, -1, 0, 0);
    try {
      // Create and initialize a converter that will raise an exception if any
      //  portion of the file is not valid according to the specified encoding
      var convInputStream = Cc["@mozilla.org/intl/converter-input-stream;1"].
       createInstance(Ci.nsIConverterInputStream);
      convInputStream.init(inputStream, aEncoding, 0, 0);
      try {
        // Read as much of the file as possible in one go. According to the
        //  converter input stream interface, readString may return less bytes
        //  than expected, and must be called until it returns 0 to signify the
        //  end of the file. This loop is also required to properly raise an
        //  exception if the file is not valid according to the encoding, as the
        //  first call will only return the portion of the file that precedes
        //  the faulty character.
        var entireContents = "";
        var readContentsObject = {};
        while (convInputStream.readString(0xFFFFFFFF, readContentsObject)) {
          entireContents += readContentsObject.value;
        }
        // Return the entire contents to the caller
        return entireContents;
      } finally {
        // Close the converter stream before returning or in case of exception
        convInputStream.close();
      }
    } finally {
      // Close the underlying stream. This instruction has no effect if the
      //  converter stream has been already closed successfully.
      inputStream.close();
    }
  },

  /**
   * Parse the provided RDF/XML string and feed the results to this data source.
   *
   * Relative RDF resource URLs in the provided XML string are not resolved, and
   * the declared XML namespaces are propagated to the data source.
   */
  _feedString: function(aXmlContents) {
    var emptyUri = Cc["@mozilla.org/network/io-service;1"].
     getService(Ci.nsIIOService).newURI("urn:none", null, null);
    var rdfXmlParser = Cc["@mozilla.org/rdf/xml-parser;1"].
     createInstance(Ci.nsIRDFXMLParser);
    rdfXmlParser.parseString(this._wrappedObject, emptyUri, aXmlContents);
  },

  /**
   * Returns an RDF/XML string representing an empty data source with the proper
   *  MAF XML namespace declarations.
   */
  _getMafNamespaceXml: function() {
    // Create an RDF/XML serializer for an empty data source
    var emptyDataSource =
     Cc["@mozilla.org/rdf/datasource;1?name=xml-datasource"].
     createInstance(Ci.nsIRDFDataSource);
    var serializer = Cc["@mozilla.org/rdf/xml-serializer;1"].
     createInstance(Ci.nsIRDFXMLSerializer);
    serializer.init(emptyDataSource);
    // Add the MAF namespace to the serializer
    var mafNamespaceAtom = Cc["@mozilla.org/atom-service;1"].
     getService(Ci.nsIAtomService).getAtom(this._mafNamespaceName);
    serializer.addNameSpace(mafNamespaceAtom, this._mafNamespacePrefix);
    // Run the serializer using an output stream implemented in JavaScript
    var mafNamespaceXml = "";
    serializer.QueryInterface(Ci.nsIRDFXMLSource).Serialize({
      write: function(aBuf, aCount) {
        mafNamespaceXml += aBuf;
        return aCount;
      }
    });
    // Return the generated string
    return mafNamespaceXml;
  },

  /**
   * XML/RDF data source that is wrapped by this object.
   */
  _wrappedObject: null,

  _rdf: Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService)
}
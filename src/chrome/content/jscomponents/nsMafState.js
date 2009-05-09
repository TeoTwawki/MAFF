/**
 * Mozilla Archive Format
 * ======================
 *
 *  Copyright (c) 2005 Christopher Ottley.
 *  Portions Copyright (c) 2008 Paolo Amadini.
 *
 *  This file is part of MAF.
 *
 *  MAF is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  MAF is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.

 *  You should have received a copy of the GNU General Public License
 *  along with MAF; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

// Provides MAF State service

var MAFNamespace = "http://maf.mozdev.org/metadata/rdf#";

var gRDFService = null;
var gRDFCService = null;


function GetMafStateServiceClass() {
  if (gRDFService == null) {
    gRDFService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                     .getService(Components.interfaces.nsIRDFService);
  }

  if (gRDFCService == null) {
    gRDFCService = Components.classes["@mozilla.org/rdf/container-utils;1"]
                     .getService(Components.interfaces.nsIRDFContainerUtils);
  }

  if (!sharedData.MafStateService) {
    sharedData.MafStateService = new MafStateServiceClass();
  }

  return sharedData.MafStateService;
}

/**
 * The MAF State Service.
 */
function MafStateServiceClass() {
  // Create an in memory RDF data source
  this.datasource = Components.classes["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"]
                       .createInstance(Components.interfaces.nsIRDFDataSource);

  var rootArchiveSubject = gRDFService.GetResource("http://maf.mozdev.org/metadata/rdf/open-archives");
  this.archivesSequence = gRDFCService.MakeSeq(this.datasource, rootArchiveSubject);
}

MafStateServiceClass.prototype = {
  /** A count of the number of open archives. */
  noOfArchives: 0,

  /**
   * Add archive file info to the state.
   */
  addArchiveInfo: function(archive) {
    this.noOfArchives++;

    var archiveRootSubjectStr = "http://maf.mozdev.org/metadata/rdf/archive/" + this.noOfArchives + "/";

    archive1Subject = gRDFService.GetResource(archiveRootSubjectStr);
    archive1Sequence = gRDFCService.MakeSeq(this.datasource, archive1Subject);

    this._addArchivePagesToDatasource(archiveRootSubjectStr, archive1Sequence,
                                                         archive.uri, archive);

    var archiveRootSubject = gRDFService.GetResource(archiveRootSubjectStr);
    var archivePredicate = gRDFService.GetResource(MAFNamespace + "title");
    var archiveObject = gRDFService.GetResource(MafStrBundle.GetStringFromName("archive") + " " + this.noOfArchives);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    archivePredicate = gRDFService.GetResource(MAFNamespace + "localurl");
    archiveObject = gRDFService.GetResource(archive.file.path);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    this.archivesSequence.AppendElement(archive1Subject);
  },

  getDatasource: function() {
    return this.datasource;
  },

  /**
   * For each saved page, there's an RDF file, process it to get the information.
   */
  _addArchivePagesToDatasource: function(archiveSubjectRoot, archiveSequence, archiveUri, archive) {
    // For each folder in the expanded archive root
    archive.pages.forEach(function(page, pageIndex) {
      var title = page.title || ("Page " + (pageIndex + 1));
      var originalurl = page.originalUrl || "Unknown";
      var archivetime = page.dateArchived || "Unknown";
      var localurl = page.tempUri.spec;

      var thisPageRDFSubjectRoot = archiveSubjectRoot + "" + (pageIndex + 1) + "/";
      this.addPageInfoToMetaData(thisPageRDFSubjectRoot, title, originalurl, archivetime, localurl, archiveSequence);
    }, this);
  },

  /**
   * Asserts the RDF info.
   */
  addPageInfoToMetaData: function(thisPageRDFSubjectRoot, title, originalurl, archivetime, localurl, archiveSequence) {
    // Add the page info to the metadata

    // This archive's unique archive URL resource
    var rootSubject = gRDFService.GetResource(thisPageRDFSubjectRoot);

    // Add the title
    var predicate = gRDFService.GetResource(MAFNamespace + "title");
    var object = gRDFService.GetResource(title);
    this.datasource.Assert(rootSubject, predicate, object, true);

    // Add the original url
    predicate = gRDFService.GetResource(MAFNamespace + "originalurl");
    object = gRDFService.GetResource(originalurl);
    this.datasource.Assert(rootSubject, predicate, object, true);

    // Add the archive time
    predicate = gRDFService.GetResource(MAFNamespace + "archivetime");
    object = gRDFService.GetResource(archivetime);
    this.datasource.Assert(rootSubject, predicate, object, true);

    // Add the local url
    predicate = gRDFService.GetResource(MAFNamespace + "localurl");
    object = gRDFService.GetResource(localurl);
    this.datasource.Assert(rootSubject, predicate, object, true);

    archiveSequence.AppendElement(rootSubject);
  }
};
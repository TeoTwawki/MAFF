/**
 *
 *  Copyright (c) 2004 Christopher Ottley.
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

/**
 * Extracts the archive to the specified path
 */
function MafTabExpander(tempPath, scriptPath, archivePath, folderNumber) {
  /** The path of the temp folder to use. */
  this.tempPath = tempPath,

  /** The path of the archive script to use. */
  this.scriptPath = scriptPath,

  /** The full path of the archive file to archive to. */
  this.archivePath = archivePath,

  /** Flag to ensure the start function isn't called twice. */
  this.started = false,

  /** The folder holding the expanded archive contents. */
  this.folderNumber = folderNumber,

  /**
   * Schedules the extract process to start.
   */
  this.start = function() {
    if (!this.started) {
      this.started = true;
      this.timerId = setTimeout(this._startExtract, 500, this);
    }
  },

  /**
   * Starts the extract process.
   */
  this._startExtract = function(objExtractor) {
    Maf.extractFromArchive(objExtractor.scriptPath, objExtractor.archivePath, MafUtils.appendToDir(objExtractor.tempPath, objExtractor.folderNumber));
    objExtractor.fnProgressUpdater(100);
  },


  /**
   * Can't kill the process, so stop does nothing really.
   */
  this.stop = function() {

  },

  /**
   * Access method to set the progress update function
   * This is the function that is called whenever there is a change
   * in progress
   */
  this.setProgressUpdater = function(fnProgressUpdater) {
    this.fnProgressUpdater = fnProgressUpdater;
  }

};

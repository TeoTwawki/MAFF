/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.6.3
 *
 * Author: Christopher Ottley
 *
 * Description: The MAF extension for Firefox and Mozilla integrates page archive functionality in the browser
 *
 *  Copyright (c) 2005 Christopher Ottley.
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

// Provides MAF Tab Expander Object

/**
 * The MAF Tab Expander
 */

function MafTabExpanderClass() {

};

MafTabExpanderClass.prototype = {

  init: function(tempPath, scriptPath, archivePath, folderNumber, Maf) {
    /** The path of the temp folder to use. */
    this.tempPath = tempPath;
    MafUtils.createDir(tempPath);

    /** The path of the archive script to use. */
    this.scriptPath = scriptPath;

    /** The full path of the archive file to archive to. */
    this.archivePath = archivePath;

    /** Flag to ensure the start function isn't called twice. */
    this.started = false;

    /** The folder holding the expanded archive contents. */
    this.folderNumber = folderNumber;

    this.Maf = Maf;
  },


  start: function() {
    if (!this.started) {
      this.started = true;
      this.timer = Components.classes["@mozilla.org/timer;1"]
                     .createInstance(Components.interfaces.nsITimer);
      this.timer.initWithCallback(this, 500, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }
  },

  /**
   * Can't kill the process, so stop does nothing really.
   */
  stop: function() {

  },

  notify: function(expiredtimer) {
    if (this.timer == expiredtimer) {
      this.timer = null;

      this.Maf.extractFromArchive(this.scriptPath, this.archivePath,
                                   MafUtils.appendToDir(this.tempPath, this.folderNumber));
      if (this.objWith_fnProgressUpdater != null) {
        this.objWith_fnProgressUpdater.progressUpdater(100, 0);
      }
    }
  },

  /**
   * Access method to set the progress update function
   * This is the function that is called whenever there is a change
   * in progress
   */
  setProgressUpdater: function(objWith_fnProgressUpdater) {
    this.objWith_fnProgressUpdater = objWith_fnProgressUpdater;
  },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsITimerCallback) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};
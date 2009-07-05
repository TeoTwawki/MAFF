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
 * Handles the MAF integrated user interface commands.
 */
var MafCommandsOverlay = {
  /**
   * Array of the "menupopup" DOM elements which we are listening for events on.
   */
  menusWithEvents: [],

  // --- Interactive overlay functions and events ---

  /**
   * Initializes the overlay by creating some DOM elements dynamically and
   *  creating the appropriate event listeners. For more information, see
   *  <https://developer.mozilla.org/en/Dynamically_modifying_XUL-based_user_interface>
   *  (retrieved 2009-03-01).
   */
  onLoad: function() {
    // Note: since this event function is copied to be used as an event
    //  listener, the "this" variable does not point to this object.

    // Remove the previously added event listener
    window.removeEventListener("load", MafCommandsOverlay.onLoad, false);

    // Listen for when the browser window closes, to perform shutdown
    window.addEventListener("unload", MafCommandsOverlay.onUnload, false);

    // Find references to the elements to be modified
    var frameContextSubmenu = document.getElementById("frame").firstChild;
    var tabBrowser = document.getElementById("content");
    var tabContextMenu = document.getAnonymousElementByAttribute(tabBrowser,
     "anonid", "tabContextMenu");

    // Find references to the new elements to be inserted
    var frameContextSubmenuNewNodes = document.
     getElementById("mafFrameContextSubmenu").childNodes;
    var tabContextMenuNewNodes = document.
     getElementById("mafTabContextMenu").childNodes;

    // Add the child elements at the appropriate positions
    MafCommandsOverlay._addChildElementsWithPositions(
     frameContextSubmenu,
     frameContextSubmenuNewNodes);
    MafCommandsOverlay._addChildElementsWithPositions(
     tabContextMenu,
     tabContextMenuNewNodes);

    // Add event listeners to check for menu item visibility. See also
    // <https://developer.mozilla.org/en/XUL/PopupGuide/PopupEvents> (retrieved
    // 2009-03-01).
    [
     document.getElementById("menu_FilePopup"),
     document.getElementById("menu_ToolsPopup"),
     document.getElementById("contentAreaContextMenu"),
     tabContextMenu
    ].forEach(function(element) {
      element.addEventListener("popupshowing",
       MafCommandsOverlay.onMenuPopupShowing, false);
      // Remember that we added an event listener
      MafCommandsOverlay.menusWithEvents.push(element);
    });
  },

  /**
   * Shuts down the overlay by removing the previously added event listeners.
   */
  onUnload: function() {
    // Remove the previously added event listener
    window.removeEventListener("unload", MafCommandsOverlay.onUnload, false);

    // Remove the event listeners on the popup menus
    MafCommandsOverlay.menusWithEvents.forEach(function(element) {
      element.removeEventListener("popupshowing",
       MafCommandsOverlay.onMenuPopupShowing, false);
    });
  },

  /**
   * Updates menu item visibility.
   */
  onMenuPopupShowing: function(aEvent) {
    // Check that the event fired for one of the menus we are interested in and
    //  not for one of the descendants
    if (MafCommandsOverlay.menusWithEvents.indexOf(aEvent.target) < 0) {
      return;
    }

    // The visibility of the MAF submenu in the Tools menu depends only on the
    //  related preference
    if (aEvent.target.id == "menu_ToolsPopup") {
      document.getElementById("mafMenuMafSubMenu_toolsMenu").hidden =
       !MozillaArchiveFormat.Prefs.interfaceMenuTools;
    }

    // For the other menus, a preference controls whether any MAF menu item is
    //  visible at all in that particular menu. Even if the preference is true
    //  for the menu, the single items must still be checked for visibility
    //  based on the context.
    var isVisibleInMenu;
    switch (aEvent.target.id) {
      case "menu_FilePopup":
        isVisibleInMenu = MozillaArchiveFormat.Prefs.interfaceMenuFile;
        break;
      case "menu_ToolsPopup":
        isVisibleInMenu = MozillaArchiveFormat.Prefs.interfaceMenuTools;
        break;
      case "contentAreaContextMenu":
        isVisibleInMenu = MozillaArchiveFormat.Prefs.interfaceMenuPageContext;
        break;
      default: // Assume this is the tab bar context menu, which has no ID
        isVisibleInMenu = MozillaArchiveFormat.Prefs.interfaceMenuTabsContext;
        break;
    }

    // Now check every menu item and, if it is linked to one of the MAF
    //  commands, set its visibility appropriately
    Array.forEach(aEvent.target.getElementsByTagNameNS(
     aEvent.target.namespaceURI, "menuitem"), function(element) {

      // Determine which class of MAF menu item we are handling
      var command = element.getAttribute("command");
      var isSaveInArchive = ([
       "mafCmdSavePageInArchive",
       "mafCmdSaveFrameInArchiveFromWindow",
       "mafCmdSaveFrameInArchiveFromContext"
       ].indexOf(command) >= 0);
      var isSaveTabs = ([
       "mafCmdSaveTabsAs",
       "mafCmdSaveAllTabsAs"
       ].indexOf(command) >= 0);

      // Do not handle unrelated menu items
      if (isSaveInArchive || isSaveTabs) {

        // Check for overall MAF element visibility in this menu
        if (!isVisibleInMenu) {
          element.hidden = true;

        // Check for "Save In Archive" elements visibility. The items are
        //  always visible in the Tools menu, while in the other menus it
        //  depends on a specific user preference.
        } else if (aEvent.target.id != "menu_ToolsPopup" && isSaveInArchive &&
         !MozillaArchiveFormat.Prefs.interfaceMenuItemSaveInArchive) {
          element.hidden = true;

        // The "Save Frame" commands appear only if there is a focused frame.
        //  The "mafCmdSaveFrameInArchiveFromContext" command is not checked
        //  because its parent menu item is already hidden if no frame is
        //  selected when the context menu is shown.
        } else if (command == "mafCmdSaveFrameInArchiveFromWindow") {
          // Set the visibility using the same checks done in "browser.js"
          element.hidden = !content || !content.frames.length ||
            !isContentFrame(document.commandDispatcher.focusedWindow);

        // Tab-related menu items appear in the page context menu only if they
        //  are not present in the tab bar context menu
        } else if (aEvent.target.id == "contentAreaContextMenu" &&
         isSaveTabs) {
          element.hidden = MozillaArchiveFormat.Prefs.interfaceMenuTabsContext;

        // The "Save Page In Archive" menu item appears in the context menu only
        //  if the "Save Page As" item also appears
        } else if (aEvent.target.id == "contentAreaContextMenu" &&
         command == "mafCmdSavePageInArchive") {
          // The event that checked for the "context-savepage" item visibility
          //  has already been processed when we get here
          element.hidden = document.getElementById("context-savepage").hidden;

        // All the other items have standard visibility
        } else {
          element.hidden = false;
        }
      }
    });

    // Show menu separators only if at least one MAF menu item is visible
    Array.forEach(aEvent.target.getElementsByTagNameNS(
     aEvent.target.namespaceURI, "menuseparator"), function(element) {

      // Filter out unrelated separators
      if (["mafMenuSaveSeparator_fileMenu",
       "mafMenuSaveSeparator_tabsContextMenu"].indexOf(element.id) >= 0) {
        // Set visibility assuming that at least one MAF item is visible in the
        //  menus that actually have a separator, if the user preference for
        //  showing items in the menu is enabled
        element.hidden = !isVisibleInMenu;
      }

    });
  },

  // --- Command implementation ---

  /**
   * Displays the "Browse open archives" window.
   */
  browseOpenArchives: function() {
    // If the archives window is already opened
    var archivesDialog = Cc["@mozilla.org/appshell/window-mediator;1"].
     getService(Ci.nsIWindowMediator).getMostRecentWindow("Maf:Archives");
    if (archivesDialog) {
      // Bring the window to the foreground
      archivesDialog.focus();
    } else {
      // Open a new window to display the available archives
      window.open(
       "chrome://maf/content/frontend/archivesDialog.xul",
       "maf-archivesDialog",
       "chrome,titlebar,centerscreen,resizable=yes");
    }
  },

  /**
   * Displays the "Preferences" window.
   */
  preferences: function() {
    // Determine the expected behavior of preferences windows
    try {
      var instantApply =
       Components.classes["@mozilla.org/preferences-service;1"]
       .getService(Components.interfaces.nsIPrefService)
       .getBranch("").getBoolPref("browser.preferences.instantApply");
    } catch(e) {
      instantApply = false;
    }
    // Open the preferences window. If instant apply is on, the window will
    //  be minimizable (dialog=no), conversely if instant apply is not enabled
    //  the window will be modal and not minimizable.
    window.openDialog(
     "chrome://maf/content/preferences/prefsDialog.xul",
     "maf-prefsDialog",
     "chrome,titlebar,toolbar,centerscreen," +
     (instantApply ? "dialog=no" : "modal"));
  },

  /**
   * Asks the user to select which of the open tabs will be saved in an archive.
   */
  saveTabsAs: function() {
    // Open a dialog that lets the user select which tabs will be saved. See
    //  "multiSaveDialog.js" for a description of the dialog arguments.
    var returnValues = {};
    window.openDialog(
     "chrome://maf/content/savefrontend/multiSaveDialog.xul",
     "maf-multiSaveDialog",
     "chrome,titlebar,centerscreen,modal,resizable=yes",
     window,
     returnValues);
    // If the dialog was not canceled by the user
    if (returnValues.selectedTabs) {
      // Use the global saveDocument function with the special MAF parameters
      saveDocument(getBrowser().selectedBrowser.contentDocument,
       {mafAskSaveArchive: true, mafSaveTabs: returnValues.selectedTabs});
    }
  },

  /**
   * Saves all of the open tabs in an archive.
   */
  saveAllTabsAs: function() {
    // Use the global saveDocument function with the special MAF parameters
    saveDocument(getBrowser().selectedBrowser.contentDocument,
     {mafAskSaveArchive: true, mafSaveTabs: getBrowser().browsers});
  },

  /**
   * Saves the current tab in an archive.
   */
  savePageInArchive: function() {
    // Use the global saveDocument function with the special MAF parameters
    saveDocument(getBrowser().selectedBrowser.contentDocument,
     {mafAskSaveArchive: true});
  },

  /**
   * Saves the focused frame in an archive.
   */
  saveFrameInArchiveFromWindow: function() {
    var focusedWindow = document.commandDispatcher.focusedWindow;
    if (isContentFrame(focusedWindow)) {
      // Use the global saveDocument function with the special MAF parameters
      saveDocument(focusedWindow.document,
       {mafAskSaveArchive: true});
    }
  },

  /**
   * Saves the selected frame in an archive.
   */
  saveFrameInArchiveFromContext: function() {
    // Use the global saveDocument function with the special MAF parameters
    saveDocument(gContextMenu.target.ownerDocument,
     {mafAskSaveArchive: true});
  },

  // --- Overlay support functions ---

  /**
   * Adds children to the specified DOM element, respecting the positions
   *  specified using a simplified version of the "insertbefore" and
   *  "insertafter" attributes of the children. Elements are moved, not copied.
   *
   * @param aElement       Element whose children are being modified.
   * @param aNewChildren   List of child elements to add.
   */
  _addChildElementsWithPositions: function(aElement, aNewChildren) {
    // Each entry in the provided DOM element list is moved to the appropriate
    //  destination and removed from the original list.
    while (aNewChildren.length > 0) {
      var newChild = aNewChildren[0];
      // Insert the new element either before or after another element
      if (newChild.hasAttribute("insertbefore")) {
        var beforeId = newChild.getAttribute("insertbefore");
        aElement.insertBefore(newChild, document.getElementById(beforeId));
      } else {
        var afterId = newChild.getAttribute("insertafter");
        aElement.insertBefore(newChild,
         document.getElementById(afterId).nextSibling);
      }
    }
  }
}

// Now that the MafCommandsOverlay object is defined, add the event listener
//  that will trigger the initialization when all of the overlays are loaded
window.addEventListener("load", MafCommandsOverlay.onLoad, false);

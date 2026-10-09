NetLister                      ▄ ▄ ▄
for Synchronet                 █████
Version 0.260724               ▐▄█▄▌ cf
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
by Craig Hendricks
codefenix@conchaos.synchro.net

ConstructiveChaos BBS:
  https://conchaos.synchro.net
 telnet://conchaos.synchro.net
    ssh://conchaos.synchro.net



NetLister is a lightbar-driven nodelist browser for Synchronet. 

Features:

- Finds the most recent nodelist available per FTN on your system. 
- Capable of listing nodes for QWK networks. 
- Displays network-themed ANSI files per network.



Instructions:

 1. Extract the contents of the ZIP file to /sbbs/xtrn/netlister

    On Linux, ensure the user running sbbs has read/write permissions to this 
    directory.
    

 2. Edit settings.ini:

    Each setting section must start with "ftn_" or "qwk_" and the name of the 
    network enclosed in square brackets.

    FTN Networks:
      
    Valid FTN settings are:
      
    text ....... This is the visible menu option. Include an ampersand (&) in
                 front of the character you want to use as a hotkey.       
                 If omitted, the string to the right of the underscore is used
                 by default.
    nodelist ... This is the path to the nodelist for the FTN.
                 Valid settings may be:
                 - A path to a static nodelist file (typically the same as what
                   you configured in FidoCFG under Domains, if you did that).
                 - A path to a static nodelist archive.
                 - A path to a directory containing nodelist files or archives.
                   The newest one will be selected automatically.
                 If nodelist is invalid, the FTN will be ignored.
    art ........ This is a path to an ANSI file or CTRL-A file to display with 
                 the FTN menus. This could be artwork from the infopack for the 
                 net. Pick your favorite one available (or make your own) and 
                 store it somewhere, then set your path to it here. The first 10
                 rows will be visible. If left blank, the NetLister main menu
                 art gets used by default.      

    Example FTN setting:

    [ftn_FidoNet]
    text=&FidoNet
    nodelist=c:\path\to\NODELIST.txt
    art=c:\path\to\hdr-fidonet.ans

    Add as many listings as you have FTNs and nodelists.


    QWK Networks:
      
    Valid QWK settings are:
      
    text ....... Same as with FTN setting above.
    id ......... This is the Hub System ID as configured for the QWK Network
                 in SCFG.
    art ........ Same as with FTN setting above.

    Example QWK setting:

    [qwk_DOVE-Net]
    text=&DOVE-Net
    id=VERT
    art=c:\path\to\hdr-dovenet.ans

    Add as many listings as you have QWK networks. The script should find as 
  	many QWK nodes that Synchronet is aware of.
	
	  If for some reason more than one network uses a common QWK hub ID, 
	  NetLister will not have a way to differentiate them, and will be  
    forced to treat them as though they're one single network.

 
 3. Add to SCFG -> External Programs-> Online Programs (Doors):

    Name                     NetLister
    Internal Code            NETLISTER
    Start-up Directory       ../xtrn/netlister
    Command Line             ?netlister.js
    Execution Requirements   ANSI



Usage:

If you've configured any QWK networks, when you (the sysop) runs NetLister for
the first time, you'll see a prompt telling you the file "nodes.dat" is either 
out of date or nonexistent. You'll want to answer Yes to this prompt for 
reasons explained below.



How It Works:

QWK node listings are based on the list of active QWK nodes in the route.dat
file (located in /sbbs/data/qnet). If you do not see a QWK node listed in 
NetLister, the most likely reason is because it's not listed in route.dat. See
this wiki page for more into about how Synchronet uses and maintains route.dat:
https://wiki.synchro.net/util:qwknodes#routedat

The below files are used to supply extra data for QWK nodes:

- /sbbs/data/sbbslist.json ..... Primary source of additional QWK node data.
- /sbbs/data/bbses.ini ......... Mainly used by the avatars module, but also
                                 contains data useful for QWK nodes if not 
                                 available in sbbslist.json.
- /sbbs/ctrl/nodes.dat ......... This file is used only if the above two files
                                 don't contain any useful information for a QWK
                                 node. It gets generated as-needed by Netlister 
                                 using Synchronet's qwknodes utility (see same 
                                 link above for more info).

FTN data is compiled by simply reading the nodelists available on the system.
Unlike the fido-nodelist-browser.js module that comes with Synchronet, which 
requires you to configure a static nodelist per domain in FidoCfg, NetLister 
can optionally find the latest nodelist available given the path where your 
FTN nodelist archive files are stored. 



About Art Files:

The netlister.ans and nlsearch.ans files may be edited to your liking, and may
be ANSI, CTRL-A, or plain text files. The extensions .MSG, .ANS, .ASC, or .TXT
may be used, in that order of priority (i.e.: if netlister.msg and netlister.ans
both exist, netlister.msg will be used).

You should find one or more ANSI art files available in the infopacks for most
FTNs. Simply pick the one you like the most and add it to each FTN you add to 
settings.ini. The first 10 lines should display nicely above the listings, so 
you may need to make edits as needed.

If you need an ANSI file for DOVE-Net, look for dove-net_logos.zip.



Thanks & Greetz:
    
Huge thanks to Nightfox of Digital Distortion BBS for creating and 
maintaining the awesome DDLightbarMenu library for Synchronet.
  - www.digitaldistortionbbs.com      

Big thanks to the following for testing and providing feedback!
  
  StingRay @ A-Net Online:
    - a-net-online.lol  

  xbit @ The X-Bit BBS:
    - x-bit.org 



Limitations:

  - Support for terminals wider than 80 columns is not fully implemented.
    
    - At the time of this writing, there does not seem to be a way within 
    the context of Synchronet's QWK hub / QWK network relationship to keep 
    networks sharing a common QWK hub ID separate. This means if two or more
    networks happen to use a common QWK hub ID, NetLister has no way of 
    differentiating them, and treats them as one single network.
    


Version History:

v 0.260724:

  + Fix for nodelists lacking Region lines.
  + Added support for nodelists within archives other than ZIP (RAR, ARJ, 
    LZH, and LHA).
  + Other various small improvements and fixes.  
  

v 0.260507:

  + Small fix to address if some QWK BBS in the sbbslist uses the same 
    network address as the QWK hub (e.g.: "VERT"), causing it to show 
    the wrong BBS's information in place of the actual QWK hub. If the
    QWK hub's info isn't found, a default name of "<QWKHub> HQ" is used.


v 0.260226:

  + Reworked search logic.
  + Fixed an issue in which entering \ by itself would cause 
    search to crash.
  + General code cleanup all throughout.
  + Added notes in the readme regarding common hub IDs across 
    two or more QWK networks.


v 0.251229 - Dec 29, 2025:

  + Addressed a selection alignment issue when some menu options
    in the settings.ini contain an ampersand while others do not.
  

v 0.251218 - Dec 18, 2025:

  + Initial version.


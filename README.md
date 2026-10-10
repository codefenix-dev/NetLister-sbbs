# NetLister

NetLister is a lightbar-driven nodelist browser for Synchronet. 

## Features:

- Finds the most recent nodelist available per FTN on your system. 
- Capable of listing nodes for QWK networks. 
- Displays network-themed ANSI files per network.

<img width="816" height="599" alt="Animation5" src="https://github.com/user-attachments/assets/5ba6de3c-90ba-4fa2-b3e1-59ec9b085893" />

## How It Works:

### QWK Nodes
QWK node listings are based on the list of active QWK nodes in the route.dat
file (located in /sbbs/data/qnet). If you do not see a QWK node listed in 
NetLister, the most likely reason is because it's not listed in route.dat. See
this wiki page for more into about how Synchronet uses and maintains route.dat:
https://wiki.synchro.net/util:qwknodes#routedat

The below files are used to supply extra data for QWK nodes:

- `/sbbs/data/sbbslist.json`: Primary source of additional QWK node data.
- `/sbbs/data/bbses.ini`: Mainly used by the avatars module, but also
                                 contains data useful for QWK nodes if not 
                                 available in sbbslist.json.
- `/sbbs/ctrl/nodes.dat`: This file is used only if the above two files
                                 don't contain any useful information for a QWK
                                 node. It gets generated as-needed by Netlister 
                                 using Synchronet's qwknodes utility (see same 
                                 link above for more info).

### FTN Nodes
FTN data is compiled by simply reading the nodelists available on the system.
Unlike the fido-nodelist-browser.js module that comes with Synchronet, which 
requires you to configure a static nodelist per domain in FidoCfg, NetLister 
can optionally automatically find the latest nodelist available  given the path where your 
FTN nodelist archive files are stored. 


## About Art Files:

The netlister.ans and nlsearch.ans files may be edited to your liking, and may
be ANSI, CTRL-A, or plain text files. The extensions .MSG, .ANS, .ASC, or .TXT
may be used, in that order of priority (i.e.: if netlister.msg and netlister.ans
both exist, netlister.msg will be used).

You should find one or more ANSI art files available in the infopacks for most
FTNs. Simply pick the one you like the most and add it to each FTN you add to 
settings.ini. The first 10 lines should display nicely above the listings, so 
you may need to make edits as needed.

If you need an ANSI file for DOVE-Net, look for dove-net_logos.zip.


## Limitations:

  - Support for terminals wider than 80 columns is not fully implemented.
    
  - At the time of this writing, there does not seem to be a way within 
    the context of Synchronet's QWK hub / QWK network relationship to keep 
    networks sharing a common QWK hub ID separate. This means if two or more
    networks happen to use a common QWK hub ID, NetLister has no way of 
    differentiating them, and treats them as one single network.
    


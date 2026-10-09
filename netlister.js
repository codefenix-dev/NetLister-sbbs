/*

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

*/

load("sbbsdefs.js");
require("dd_lightbar_menu.js", "DDLightbarMenu");

const WIDTH = console.screen_columns;
const HEIGHT = console.screen_rows;
const UP = ascii(24); // Character used to signify UP arrow.
const DOWN = ascii(25); // Character used to signify DOWN arrow.
const CAP = ascii(254); // Character used at the ends of the lines drawn.
const LINE = ascii(196); // Character used to draw the horizontal divider line.
const DIVIDER = "\x01b\x01h" + CAP + "\x01n\x01b" + (new Array(WIDTH - 2).join(LINE)) + "\x01b\x01h" + CAP;
const SCREEN_RESET = "\x01q\x01l\x01n\x010\x1b[0;0 D"; // Clears screen, resets screen pause, resets colors, and resets font (if changed while calling another BBS).
const EXEC_PATH = backslash(js.exec_dir);
const ART_FILE = findArt("netlister");
const SCROLLER_PATH = "../xtrn/scroller/scroller.js";
const SCROLLER_CMD_FMT = '?%s "%s" "%s" %s';

// QWKnet BBS info sources; these files should be consistent across all SBBS systems
const QN_ROUTE_DAT = backslash(system.data_dir) + "qnet/route.dat"; // listing of active QWK nodes
const QN_SBBS_LIST = backslash(system.data_dir) + "sbbslist.json";  // primary source of additional info for QWK nodes
const QN_BBSES_INI = backslash(system.data_dir) + "bbses.ini";      // mainly used by the avatars.js script.. secondary source of additional info for QWK nodes
const QN_NODES_DAT = backslash(system.ctrl_dir) + "nodes.dat";      // tertiary source of additional info for QWK nodes
const QWKNODES_CMD = backslash(system.exec_dir) + "qwknodes -tm90 n";

var ftnNets = [];
var qwkNets = {};
var gSbbsList;
var gNetLists = [];
var gBbsesIni = [];
var gQwkNodes = [];

function findArt(basename) {
    var retPath="";
    var exts = [".msg", ".ans", ".asc", ".txt"];
    for (var e in exts) {
        if (file_exists(EXEC_PATH + basename + exts[e])) {
            retPath = EXEC_PATH + basename + exts[e];
            break;
        }
    }
    return retPath;
}

function loadBbsesIni() {
    var qb = new File(QN_BBSES_INI);
    if (qb.open("r", true)) {
        var qsections = qb.iniGetSections();
        for (var q in qsections) {
            gBbsesIni.push({"qwk_id": qb.iniGetValue(qsections[q], "netaddr"), "name": qsections[q]});
        }
        qb.close();
    } else {
        log(LOG_ERR, "Error reading " + QN_BBSES_INI);
    }
}

function findBbsData(qHub, qName, retObj, isHub) {
	retObj.src = [];
	for (var o = 0; o < gSbbsList.length; o++) {
		if (gSbbsList[o].service) {
			if (isHub) {
				for (var n = 0; n < gSbbsList[o].service.length; n++) {
					if (gSbbsList[o].service[n].address) {
						if (gSbbsList[o].service[n].address.substr(0, qName.length).toUpperCase()==qName) {
							retObj.name = gSbbsList[o].name;
							retObj.sysop = gSbbsList[o].sysop[0].name;
							retObj.location = gSbbsList[o].location;
							retObj.src.push("sbbslist");
							for (var t = 0; t < gSbbsList[o].service.length; t++) {
								if (gSbbsList[o].service[t].protocol=="telnet") {
									if (gSbbsList[o].service[t].address) {
										retObj.telnet_addr = gSbbsList[o].service[t].address + (gSbbsList[o].service[t].port ? (":" + gSbbsList[o].service[t].port) : "");
										break;
									}
								}
							}
							break;
						}
					}
				}
			} else {
				for (var n = 0; n < gSbbsList[o].network.length; n++) {
					if (gSbbsList[o].network[n].address) {
						if (gSbbsList[o].network[n].address.toUpperCase()==qName) {
							retObj.name = gSbbsList[o].name;
							retObj.sysop = gSbbsList[o].sysop[0].name;
							retObj.location = gSbbsList[o].location;
							retObj.src.push("sbbslist");
							for (var t = 0; t < gSbbsList[o].service.length; t++) {
								if (gSbbsList[o].service[t].protocol=="telnet") {
									if (gSbbsList[o].service[t].address) {
										retObj.telnet_addr = gSbbsList[o].service[t].address + (gSbbsList[o].service[t].port ? (":" + gSbbsList[o].service[t].port) : "");
										break;
									}
								}
							}
							break;
						}
					}
				}				
			}
		}
	}
    if (!retObj.name) {
        for (var i = 0; i < gBbsesIni.length; i++) {
            if ((gBbsesIni[i].qwk_id===qHub + '/' + qName) || (isHub && gBbsesIni[i].qwk_id===qHub)) {
                retObj.name = gBbsesIni[i].name;
				retObj.src.push("bbses.ini");
                break;
            }
        }
    }

    if (!retObj.name || !retObj.telnet_addr || !retObj.location) {
        for (var i = 0; i < gQwkNodes.length; i++) {
            if (gQwkNodes[i].substr(0,8).trim() === qName) {
                var found = gQwkNodes[i].substr(10);
                if (!retObj.name) {
                    retObj.name = found.replace("* Origin: ", "").replace("Sent from", "").trim();
					retObj.src.push("nodes.dat");
                }
                if (!retObj.telnet_addr) {
                    retObj.telnet_addr = found.match(/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi);
                    if (retObj.telnet_addr) {
                        retObj.telnet_addr = retObj.telnet_addr[0].trim();
                    }
                }
                if (!retObj.location) {
                    retObj.location = found.match(/[A-Za-z ]+,[ ]?[A-Za-z]{2}/gi);
                    if (retObj.location) {
                        retObj.location = retObj.location[retObj.location.length-1].trim();
                    }
                }
                break;
            }
        }
    }
}

function loadQwkNodes() {
    var qHub, qDat, qName, node, name, sysop, location, telnetAddr;
    var netName, netArt, netExists, qIndex, lastSeen;
    var sbbsObj;
    var ql = new File(QN_ROUTE_DAT);
    if (ql.open("r", true)) {
        var qwk_nodes = ql.readAll();
        ql.close();
        for (var qrow in qwk_nodes) {
            lastSeen = qwk_nodes[qrow].split(' ')[0];
            qDat = qwk_nodes[qrow].split(' ')[1];
            qHub = qDat.split(':')[1];
            qName = qDat.split(':')[0];

            if (qHub.indexOf('/') >= 0) {
                qName = qHub.split('/')[1] + '/' + qName;
                qHub = qHub.split('/')[0];
            }			
			if (!qwkNets[qHub]) {
				continue;
			}

            qIndex = 0;
            netName = qwkNets[qHub][0];
            netArt = qwkNets[qHub][1];
            netExists = false;
            for (var net in gNetLists) {
                if (gNetLists[net].net===netName) {
                    netExists=true;
                    break;
                }
                qIndex = qIndex + 1;
            }
            if (!netExists) {
                gNetLists.push({"net": netName, "type": "QWK", "nodes": [], "node_count": 0, "art": netArt});
                sbbsObj = {name:"", location:"", sysop:"", telnet_addr:""};
                findBbsData(qHub, qHub, sbbsObj, true);
                gNetLists[qIndex].nodes.push({
                    "node":        qHub,
                    "name":        sbbsObj.name || (netName + " HQ"),
                    "location":    sbbsObj.location || "",
                    "sysop":       sbbsObj.sysop,
                    "telnet_addr": sbbsObj.telnet_addr || "",
                    "qwk_hub":     qHub,
					"src":         sbbsObj.src.join(",")
                });
                gNetLists[qIndex].node_count++;
                gNetLists[qIndex].info = "QwkNodes data current as of " + system.timestr(ql.date);               
            
                gNetLists[qIndex].nodes.push({ // don't forget to add the BBS the script is running on!
                    "node":        system.qwk_id,
                    "name":        system.name,
                    "location":    system.location,
                    "sysop":       system.operator,
                    "telnet_addr": "this BBS!",
                    "qwk_hub":     qHub,
                    "last_seen":   ""
                });
                gNetLists[qIndex].node_count++;
            }

            node = /* hub + '/' +*/ qName;
            name = "";
            location = "";
            sysop = "";
            telnetAddr = "";
            sbbsObj = {name:"", location:"", sysop:"", telnet_addr:""};
            findBbsData(qHub, qName, sbbsObj, false);
            name = sbbsObj.name;
            location = sbbsObj.location;
            sysop = sbbsObj.sysop;
            telnetAddr = sbbsObj.telnet_addr;

            gNetLists[qIndex].nodes.push({
                "node":        node,
                "name":        name || node,
                "location":    location || "",
                "sysop":       sysop,
                "telnet_addr": telnetAddr || "",
                "qwk_hub":     qHub,
                "last_seen":   lastSeen,
				"src":         sbbsObj.src.join(",")
            });
            gNetLists[qIndex].node_count++;
        }
        for (var q in gNetLists) {
            if (gNetLists[q].nodes) {
                gNetLists[q].nodes.sort(function (a, b) {
                    return a.node === a.qwk_hub ? -1 : a.node.localeCompare(b.node); // place the hub at the top, and sort the rest alphabetically
                });
            }
        }
    } else {
        log(LOG_ERR, "Error reading " + QN_ROUTE_DAT);
    }
}

function isArchive(file) {
    var res = false;
    var f = new File(file);
    if (f.open("rb")) {
        var headerBytes = f.read(7);
        res = (headerBytes.substr(0,4) === "\x50\x4B\x03\x04"         || // ZIP
               headerBytes.substr(0,6) === "\x52\x61\x72\x21\x1A\x07" || // RAR
               headerBytes.substr(0,2) === "\x60\xEA"                 || // ARJ               
               headerBytes.substr(2,3) === "\x2D\x6C\x68"                // LZH / LHA
        )
        f.close();
    }
    return res;
}

function findNewestNodelist(path) {
    var newest = "";
    var files = directory(backslash(path) + "*");
    if (files.length > 0) {
        newest = files[0];
        for (var f in files) {
            if (file_date(files[f]) > file_date(newest)) {
                newest = files[f];
            }
        }
    }
    return newest;
}

function loadFtnNodes(nlFile, netName, art, nlIndex) {
    var nodeData, zone, region, hub, node, name, sysop, location, telnetAddr, telnetPort, flags, status;
    var zName, zcName, z, rName, rcName, r, hName, ncName, ncAddr, h, info;
    var rows;
    var archived = false;
    info = "";
    z = -1;
    r = -1;
    h = -1;

    if (file_isdir(nlFile)) {
        nlFile = findNewestNodelist(nlFile);
        archived = isArchive(nlFile);
    } else if (file_exists(nlFile)) {
        archived = isArchive(nlFile);        
    } else {
        log(LOG_WARNING, "Invalid nodelist setting for " + netName.replace("&", "") + ": " + nlFile);
        return 0;
    }  
    
    if (archived) {
        var a = new Archive(nlFile);
        var ext = file_getext(nlFile).replace(/[ZRAL]/i, "*"); // the nodelist will be the only file matching the
        var afiles = a.list(false, "*" + ext);                 // last 2 characters (digits) of the archive extension
        if (afiles.length > 0) {
            rows = a.read(afiles[0].name).split(/\n/);
        }
    } else {        
        var nl = new File(nlFile);
        if (nl.open("r", true)) {
            rows = nl.readAll();
            nl.close();
        }
    }

    if (rows === undefined) { // gracefully ignore in case reading the nodelist data failed
		log(LOG_WARNING, "Coundn't read contents of " + nlFile + " for " + netName.replace("&", "") + ".");
        return 0;
    }

    gNetLists.push({"net": netName, "type": "FTN", "zones": [], "node_count": 0, "art": art, "info": ""});

    for (var i = 0; i < rows.length; i++) {

        // FTN Nodelist info: http://ftsc.org/docs/
        if (rows[i].search(/^\;A/i) === 0) {
            info = info + rows[i].replace(/^\;A/i, "") + "\r\n";
            continue;
        } else if (rows[i].search(/^\;/i) === 0) {
            continue;
        }

        nodeData = rows[i].split(',');
        if (nodeData.length < 5) {
            continue;
        }

        name = nodeData[2].replace(/_/g, " ");
        location = nodeData[3].replace(/_/g, " ");
        sysop = nodeData[4].replace(/_/g, " ");

        switch (nodeData[0]) {
            case "Zone":
                zone = nodeData[1];
                hub = nodeData[1];
                zName = name;
                zcName = sysop;
                z = z + 1;
                r = -1;
                h = -1;
                gNetLists[nlIndex].zones.push({
                    "zone": zone,
                    "zone_name": zName,
                    "regions": []
                });
                continue;

            case "Region":
                region = nodeData[1];
                hub = nodeData[1];
                rName = name;
                rcName = sysop;
                r = r + 1;
                h = -1;
                gNetLists[nlIndex].zones[z].regions.push({
                    "region": region,
                    "region_name": rName,
                    "hubs": []
                });
                continue;

            case "Host":
                hub = nodeData[1];
                node = zone + ":" + hub + "/" + "0";
                hName = name;
                ncName = sysop;
                ncAddr = node;
                if (r === -1) {
                    // Insert a dummy region if there isn't one listed
                    region = nodeData[1];
                    rName = name;
                    rcName = sysop;
                    r = r + 1;
                    gNetLists[nlIndex].zones[z].regions.push({
                        "region": region,
                        "region_name": rName,
                        "hubs": []
                    });
                }
                h = h + 1;
                gNetLists[nlIndex].zones[z].regions[r].hubs.push({
                    "hub": hub,
                    "hub_name": hName,
                    "nodes": []
                });
                break;

            default:
                status = nodeData[0];
                node = zone + ":" + hub + "/" + nodeData[1];
                break;
        }

        telnetAddr = "";
        telnetPort = "";

        for (var f = 7; f < nodeData.length; f++) {
            flags = nodeData[f].split(':');
            if (flags[1]) {
                switch (flags[0]) {
                    case "ITN":
                        if (!isNaN(flags[1])) {
                            telnetPort = flags[1];
                        } else if (isNaN(flags[1])) {
                            telnetAddr = flags[1];
                        }
                        break;
                    case "INA":
                        if (isNaN(flags[1])) {
                            telnetAddr = flags[1];
                        }
                        break;
                }
            }
        }

        telnetAddr = telnetAddr + (telnetPort ? (":" + telnetPort) : "");

        if (!gNetLists[nlIndex].zones[z].regions[r]) {
            r = r + 1;
            gNetLists[nlIndex].zones[z].regions.push({
                "region": zone,
                "region_name": zName,
                "hubs": []
            });
        }
        if (!gNetLists[nlIndex].zones[z].regions[r].hubs[h]) {
            h = h + 1;
            gNetLists[nlIndex].zones[z].regions[r].hubs.push({
                "hub": zone,
                "hub_name": zName,
                "nodes": []
            });
        }

        gNetLists[nlIndex].zones[z].regions[r].hubs[h].nodes.push({
            "node":        node,
            "name":        name,
            "location":    location,
            "sysop":       sysop,
            "telnet_addr": telnetAddr,
            "status":      status,
            "zone":        zone,
            "zone_name":   zName,
            "zc_name":     zcName,
            "region":      region,
            "region_name": rName,
            "rc_name":     rcName,
            "hub":         hub,
            "hub_name":    hName,
            "nc_name":     ncName,
            "nc_addr":     ncAddr
        });
        gNetLists[nlIndex].node_count++;
    }
    gNetLists[nlIndex].info = info;
    return 1;
}

function sendNetmail(addr) {
    console.clear();
    bbs.netmail(addr);
}

function displayNode(node) {
    var dispExit = false;

    while (bbs.online && !js.terminated && !dispExit) {
        printf(SCREEN_RESET);

        var menu = " \x01w\x01hN\x01k\x01h) \x01nSend Netmail to Sysop";
        var opts = KEY_ESC + "QN";
        var isFtn = false;

        if (node.zone_name) {
            print (
                format("\x01n\x017\x01kZone %-22.22s \x01n\x017\x01kRegion %-19.19s \x01n\x017\x01kHub %-20.20s\x01n",
                    format("%s: %s", node.zone, node.zone_name || "-"),
                    format("%s: %s", node.region, node.region_name || "-"),
                    format("%s: %s", node.hub, node.hub_name || "-")
                ).replace(/:/g, ":\x01w\x01h")
            );
            isFtn = true;
        } else if (node.qwk_hub) {
            print ( format("\x01n\x017\x01k%-79s\x01n", format("%s (%s)", qwkNets[node.qwk_hub][0].replace("&",""), node.qwk_hub) ) );
        }

        print(DIVIDER);
        print("\x01w\x01h  " + node.name + "  \x01k\x01h(\x01n" + node.node + "\x01k\x01h) " + (node.status ? ((node.status === "Down" ? "\x01r\x01h" : "\x01c") + node.status) : "" ) + "\r\n");
        if (node.location) {
            print("\x01k\x01h  Location\x01n: \x01b\x01h" + node.location);
        }
        if (node.sysop) {
            print("\x01k\x01h     Sysop\x01n: \x01b\x01h" + node.sysop);
        }
        if (node.last_seen) {
            console.gotoxy(50, console.getxy().y-1);
            printf("\x01k\x01h Last seen\x01n: \x01b\x01h" + node.last_seen);
            console.gotoxy(1, console.getxy().y+1);
        }
        if (node.telnet_addr) {
            print("\x01k\x01h    Telnet\x01n: \x01b\x01h" + node.telnet_addr);
            opts = opts + "T";
            menu = menu + "\r\n \x01w\x01hT\x01k\x01h) \x01nTelnet to BBS ";
        }
        //if (node.src) {
        //   print("\x01k\x01h    Source\x01n: \x01b\x01h" + node.src);
        //}
        printf("\r\n\x01n");
        print(DIVIDER);

        if (isFtn) {
            if (node.nc_name !== node.zc_name) {
                print("\x01k\x01h      Z.C.\x01n: \x01b\x01h" + node.zc_name);
            }
            if (node.nc_name !== node.rc_name && node.zc_name !== node.rc_name) {
                print("\x01k\x01h      R.C.\x01n: \x01b\x01h" + node.rc_name);
            }
            if (node.nc_addr) {
                print("\x01k\x01h      N.C.\x01n: \x01b\x01h" + node.nc_name + " \x01n\x01b(" + node.nc_addr + ")");
                opts = opts + "H";
                menu = menu +  "\r\n \x01w\x01hH\x01k\x01h) \x01nSend Netmail to N.C. ";
            }
            print(DIVIDER);
        }
        printf(menu + "\r\n" + " \x01w\x01hQ\x01k\x01h) \x01nGo back " +  "\r\n\r\n > ");

        switch (console.getkeys(opts, K_UPPER)) {
            case KEY_ESC:
            case "Q":
                dispExit = true;
                break;
            case "T":
                printf(SCREEN_RESET);
                printf("Connecting to \x01w\x01h%s\x01n...\r\n", node.telnet_addr);
                bbs.telnet_gate(node.telnet_addr);
                printf(SCREEN_RESET);
                printf("\x01n\r\n\r\nDisconnected from \x01c\x01h%s\x01n. \x01hWelcome back\x01n!\r\n\r\n", node.telnet_addr);
                console.pause();
                break;
            case "N":
                sendNetmail((node.sysop ? node.sysop : "sysop") + "@" + node.node);
                break;
            case "H":
                sendNetmail(node.nc_name + "@" + node.nc_addr);
                break;
        }
    }
}

function lookForNodes(json, searchRegex, results) {
    for (var l in json) {
        //printf(".");
        if (json[l].nodes) {
            for (var n in json[l].nodes) {
                if (json[l].nodes[n].node.search(searchRegex) >= 0 ||
                    json[l].nodes[n].name.search(searchRegex) >= 0 ||
                    json[l].nodes[n].location.search(searchRegex) >= 0 ||
                    json[l].nodes[n].telnet_addr.search(searchRegex) >= 0 ||
                    json[l].nodes[n].sysop.search(searchRegex) >= 0) {
                    results.nodes.push(json[l].nodes[n]);
                }
            }
        } else if (typeof(json[l]) == "object") {
            lookForNodes(json[l], searchRegex, results);            
        }
    }
}

function searchNets() {
    var art = findArt("nlsearch");
    var searchStr;
    while (bbs.online && searchStr !== "") {
        printf(SCREEN_RESET);
        console.printfile(art, P_NOABORT);
        print(DIVIDER);
        printf("\r\n\x01n\x01h Search for anything. BBS names, sysops, locations, and more...\r\n\r\n");
        printf("\x01k\x01h (blank entry quits)\x01n: \x01h");
        searchStr = console.getstr(60).trim();
        var results = {"net": "results for \"" + searchStr + "\"", "type": "ALL", "nodes": []};
        if (searchStr) {
            printf("\r\n\x01h Searching\x01n.");
            lookForNodes(gNetLists, (new RegExp(searchStr.replace(/\\/g, "\\\\"), 'i')), results);
            if (results.nodes.length > 0) {
                results.nodes.sort(function (a, b) {
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });
                printf(SCREEN_RESET);
                browseNodes(results, art);
            } else {
                print("\x01h\x01y\r\nNo results for \x01r"+searchStr+"\x01y!\x01n");
                console.pause();
            }
        }
    }
}

function displayText(text, title) {
    const TEMP_FILE = EXEC_PATH + "temp" + bbs.node_num + ".txt";
    var ftext = new File(TEMP_FILE);
    ftext.open("w", false);
    ftext.write(text);
    ftext.close();
    if (file_exists(SCROLLER_PATH)) {
        bbs.exec( format(SCROLLER_CMD_FMT, SCROLLER_PATH, TEMP_FILE, title.replace(/[^a-zA-Z0-9 -,'":!@#$%^&*()]/g, ""), "top" ), 0, EXEC_PATH );
    } else {
        console.clear(false);
        print(DIVIDER);
        console.printfile(TEMP_FILE);        
        print(DIVIDER);
        console.pause();                    
    }      
    file_remove(TEMP_FILE);                         
}

function browseNodes(net, art) {
    var funcExit = false;
    var selection = -1;
    var lastSelected = "";
    var optIndex = 0;
    var levelName, levelType;
    art = art || (net.art || ART_FILE);

    while (bbs.online && !js.terminated && !funcExit) {
        console.clear();
        console.printfile(art, P_NOABORT);
        optIndex = 0;
        console.gotoxy(35, HEIGHT-1);
        console.center("\x01w\x01hQ\x01k\x01\h) \x01n Go back");
        var lbMenu = new DDLightbarMenu(1, 13, WIDTH-1, HEIGHT-14);

        console.gotoxy(1, 11);
        if (net.zones) {
            levelName = net.net.replace('&','');
            levelType = "zone";
            for (var z in net.zones) {
                lbMenu.Add( format ("Zone #%s: %-30.30s", net.zones[z].zone, net.zones[z].zone_name ), Number(z) );
                optIndex = optIndex + 1;
            }
            lbMenu.Add( "- Nodelist &Info -", "Info" );
        } else if (net.regions) {
            levelName = net.zone_name;
            levelType = "region";
            for (var r in net.regions) {
                lbMenu.Add( format ("Region #%s: %-30.30s", net.regions[r].region, net.regions[r].region_name), Number(r) );
                optIndex = optIndex + 1;
            }
        } else if (net.hubs) {
            levelName = net.region_name;
            levelType = "hub";
            for (var h in net.hubs) {
                lbMenu.Add( format ("Hub #%s: %-30.30s", net.hubs[h].hub, net.hubs[h].hub_name), Number(h) );
                optIndex = optIndex + 1;
            }
        } else if (net.nodes) {
            levelName = (net.hub_name || net.net.replace("&",""));
            levelType = "node";
            for (var n in net.nodes) {
                lbMenu.Add( format ("%1s %-20.20s %-30.30s %-20.20s", (net.nodes[n].status || " ").substr(0,1), net.nodes[n].node, net.nodes[n].name || ".. unknown ..", net.nodes[n].location || ""), Number(n) );
                optIndex = optIndex + 1;
            }
        }
        console.center("\x01nBrowsing \x01w\x01h" + levelName + "\x01n \x01k\x01h(\x01w\x01h" + optIndex + " \x01n" + levelType + (optIndex> 1?"s":"")+"\x01k\x01h)");
        console.center("\x01nUse \x01w\x01h" + UP + " \x01nand \x01w\x01h" + DOWN +" \x01nkeys to scroll, \x01w\x01hENTER \x01nselects");
        lbMenu.colors.itemColor = "\x01k\x01h";
        lbMenu.colors.borderColor = "\x01k\x01h";
        lbMenu.colors.selectedItemColor = "\x01w\x01h\x01" + "5";
        lbMenu.colors.itemTextCharHighlightColor = "\x01w\x01h";
        lbMenu.AddAdditionalQuitKeys("qQ");
        lbMenu.borderEnabled = true;
        lbMenu.scrollbarEnabled = true;
        lbMenu.ampersandHotkeysInItems = levelType ? true : false;
        if (lastSelected !== undefined && lastSelected !== "" ) {
            lbMenu.SetSelectedItemIdx(lastSelected);
        }
        selection = lbMenu.GetVal();

        if (selection === null) {
            funcExit = true;
        } else if (selection==="Info") {
            displayText(net.info, net.net.replace('&','') + " Nodelist Info");
        } else {
            lastSelected = Number(selection);
            if (net.zones) {
                browseNodes(net.zones[lastSelected], art);
            } else if (net.regions) {
                browseNodes(net.regions[lastSelected], art);
            } else if (net.hubs) {
                browseNodes(net.hubs[lastSelected], art);
            } else if (net.nodes[lastSelected]) {
                displayNode(net.nodes[lastSelected]);
            }
        }
    }
}

function mainMenu() {
    var funcExit = false;
    var selection = "";
    var lastSelected;

    while (bbs.online && !js.terminated && !funcExit) {
        printf("\x01n\x010\x01L");
        console.home();
        console.printfile(ART_FILE, P_NOABORT);
        console.gotoxy(35, HEIGHT-1);
        console.center("\x01w\x01hQ\x01k\x01\h) \x01w\x01hQ\x01nuit");
        var lbMenu = new DDLightbarMenu(20, 10, 40, 10);
        for (var l in gNetLists) {
			var lenfmt = "%-15.15s";
			if (gNetLists[l].net.indexOf('&') < 0) {
				lenfmt = "%-14.14s"; // shorten by one if it doesn't contain an ampersand (&)
			}
            lbMenu.Add( format(" "+ lenfmt + "  (%s)   %d nodes", gNetLists[l].net, gNetLists[l].type, gNetLists[l].node_count), Number(l) );
        }
        lbMenu.Add( " &Search", "Search" );
        console.gotoxy(20, 9);
        console.center("\x01nUse \x01w\x01h" + UP + " \x01nand \x01w\x01h" + DOWN +" \x01nkeys to scroll, \x01w\x01hENTER \x01nselects");
        lbMenu.colors.itemColor = "\x01w";
        lbMenu.colors.borderColor = "\x01k\x01h";
        lbMenu.colors.selectedItemColor = "\x01w\x01h\x01" + "5";
        lbMenu.colors.itemTextCharHighlightColor = "\x01k\x01h";
        lbMenu.AddAdditionalQuitKeys("qQ");
        lbMenu.borderEnabled = true;
        lbMenu.scrollbarEnabled = true;
        if (lastSelected !== undefined && lastSelected !== "" ) {
            lbMenu.SetSelectedItemIdx(lastSelected);
        }
        selection = lbMenu.GetVal();

        lastSelected = selection;
        if (selection === null) {
            funcExit = true;
        } else if (selection==="Search") {
            searchNets();
        } else {
            selection = parseInt(selection);
            browseNodes(gNetLists[selection]);
        }
    }
}

function capitalize(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function maintainQwkNodesFile(mode) {
    print(SCREEN_RESET);
    print("\x01c\x01hSysop Prompt:");
    print(DIVIDER);
    if (console.yesno("\x01n\x01h" + QN_NODES_DAT + "\x01n " +(mode==="create"?"was not found":"is out of date")+ ".\r\n\r\n" +
        "    This file is used to add extra detail for QWK nodes.\r\n\r\n    "+capitalize(mode)+ " it")) {
        print("\x01n\x01h\r\n" + (mode==="create"?"Creating":"Updating") + ". \x01nThis will take a moment. \x01y\x01hStandby..\x01n.");
        if (system.exec(QWKNODES_CMD) === 0) {
            print(QN_NODES_DAT + " " + mode + "d.");
        } else {
            print("Call failed: " + QWKNODES_CMD);
        }
    }
}

function init() {
    printf(SCREEN_RESET);
    console.gotoxy(25, 7);
    printf("\x01k\x01hLoading settings...");
    var f = new File(EXEC_PATH + "settings.ini");
    if (f.open("r")) {
        var settings = f.iniGetSections();
        var id, text, art, nl;
        for (fsect in settings) {
            text = f.iniGetValue(settings[fsect], "text") || settings[fsect].substr(4);
            art = f.iniGetValue(settings[fsect], "art") || "";
            if (settings[fsect].substr(0,4)==="ftn_") {
                nl = f.iniGetValue(settings[fsect], "nodelist") || "";
                ftnNets.push([text, nl, art]);
            } else if (settings[fsect].indexOf("qwk_")===0) {
                id = f.iniGetValue(settings[fsect], "id") || "";
                qwkNets[id] = [text, art];
            }
        }
        f.close();
    } else {
        log(LOG_ERR, "Error reading " + EXEC_PATH + "settings.ini");
    }
    print("\x01w\x01hdone!");

    console.gotoxy(25, 8);
    printf("\x01k\x01hCompiling FTN node data...");
    var nlIndex = 0;
    for (var nl in ftnNets) {
        nlIndex = nlIndex + loadFtnNodes(ftnNets[nl][1], ftnNets[nl][0], ftnNets[nl][2], nlIndex);
    }
    print("\x01w\x01hdone!");
    console.gotoxy(25, 9);
    printf("\x01k\x01hCompiling QWK node data...");
    f = new File(QN_SBBS_LIST);
    if (f.open("r")) {
        gSbbsList = JSON.parse(f.read());
        f.close();
    } else {
        log(LOG_ERR, "Error reading " + QN_SBBS_LIST);
    }

    if (Object.keys(qwkNets).length > 0) {
        if (user.is_sysop && !file_exists(QN_NODES_DAT)) {
            maintainQwkNodesFile("create");
        }
        f = new File(QN_NODES_DAT);
        if (user.is_sysop && f.exists && Math.round( (time() - f.date) / (60*60*24) ) > 15 ) {
            maintainQwkNodesFile("update");
        }
        if (f.open("r")) {
            gQwkNodes = f.readAll();
            f.close();
        } else {
            log(LOG_ERR, "Error reading " + QN_NODES_DAT);
        }
        loadBbsesIni();
        loadQwkNodes();
    }
    print("\x01w\x01hdone!");
    gNetLists.sort(function (a, b) {
        return a.net.replace('&','').toLowerCase().localeCompare(b.net.replace('&','').toLowerCase());
    });
	
	//var jf = new File(EXEC_PATH + "nodes.json");
	//if (jf.open("w")) {
	//	jf.write(JSON.stringify(gNetLists));
	//	jf.close();
	//}
	
    printf(SCREEN_RESET);
}

init();
mainMenu();

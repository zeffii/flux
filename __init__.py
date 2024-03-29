# This file is part of project flux. It's copyrighted by the contributors
# recorded in the version control history of the file, available from
# its original location https://github.com/zeffii/flux/commit/master
#  
# SPDX-License-Identifier: GPL3
# License-Filename: LICENSE

import importlib
import sys

bl_info = {
    "name": "flux",
    "author": "zeffii",
    "version": (0, 0, 0, 1),
    "blender": (2, 82, 0),
    "location": "Node Editor",
    "category": "Node",
    "description": "node-based numpy programming",
    "warning": "",
    "wiki_url": "https://github.com/zeffii/flux/wiki",
    "tracker_url": "https://github.com/zeffii/flux/issues"
}

reload_event = 'flux' in locals()

# force root module name
sys.modules["flux"] = sys.modules[__name__]

import flux
if reload_event:
    from flux.core import perform_import_reload
    perform_import_reload()

from flux.core import register, unregister

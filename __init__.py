# This file is part of project Sverchok. It's copyrighted by the contributors
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

# force root module name
sys.modules["flux"] = sys.modules[__name__]

import flux
reload_event = "bpy" in locals()

if reload_event:
    print("flux: re importing... todo")

import bpy
from flux.core import register, unregister

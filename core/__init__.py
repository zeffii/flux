# This file is part of project Sverchok. It's copyrighted by the contributors
# recorded in the version control history of the file, available from
# its original location https://github.com/zeffii/flux/commit/master
#  
# SPDX-License-Identifier: GPL3
# License-Filename: LICENSE

# pylint: disable=c0103

import bpy
import flux
from flux import nodes
from flux.core import sockets, node_tree, node_categories, module_functions
from flux.ui import nodeview_item_panel_additions

flux_modules = [
    sockets, node_tree, nodes, node_categories,
    nodeview_item_panel_additions
]

"""
   # reload base modules
    _ = [importlib.reload(im) for im in imported_modules]

    # reload nodes
    _ = [importlib.reload(node) for node in node_list]
"""

register, unregister = module_functions.register_modules(flux_modules)
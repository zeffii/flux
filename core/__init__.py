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

from flux.core import (
    update_system, sockets, node_tree, flux_cache,
    node_categories, module_functions)

from flux.core.operators import text_copy_to_clipboard  # this will need to be automatic...
from flux.ui import nodeview_item_panel_additions

flux_modules = [
    sockets, node_tree, nodes, node_categories,
    nodeview_item_panel_additions,
    text_copy_to_clipboard
]

def perform_import_reload():
    print("flux: starting reload with importlib")
    import importlib
    from flux.core import flux_modules
    from flux.nodes import node_list
    _ = [importlib.reload(im) for im in flux_modules]
    _ = [importlib.reload(node) for node in node_list]
    print('flux: performed importlib reload on flux_modules and node_list, seems ok')

register, unregister = module_functions.register_modules(flux_modules)
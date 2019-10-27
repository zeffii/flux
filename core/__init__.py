# This file is part of project Sverchok. It's copyrighted by the contributors
# recorded in the version control history of the file, available from
# its original location https://github.com/zeffii/flux/commit/master
#  
# SPDX-License-Identifier: GPL3
# License-Filename: LICENSE

from flux.core import sockets, node_tree, node_categories

modules = [sockets, node_tree, node_categories]
def register():
    for module in modules:
        module.register()

def unregister():
    for module in reversed(modules):
        module.unregister()

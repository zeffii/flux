from flux.core import sockets, node_tree


def register():
    for module in [sockets, node_tree]:
        module.register()

def unregister():
    for module in [sockets, node_tree]:
        module.unregister()

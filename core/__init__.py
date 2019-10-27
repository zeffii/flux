def register():
    from flux.core.sockets import register as sockets_register
    from flux.core.node_tree import register as ntree_register
    sockets_register()
    ntree_register()

def unregister():
    from flux.core.node_tree import unregister as ntree_unregister
    from flux.core.sockets import unregister as sockets_unregister
    ntree_unregister()
    sockets_unregister()    



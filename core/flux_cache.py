

# did you expect anything more complicated?

graph_cache = {}



# data is stored using keys `(nodetree.name, node.name, socket.index)`
data_cache = {}


def data_get(socket):
    tree_key = socket.node.id_data.name
    socket_key = socket.node.name, socket.index

    tree_cache = data_cache.get(tree_key)
    if tree_cache:
        return tree_cache.get(socket_key)
    
    return [f'no tree data for {tree_key},{socket_key},({socket.name}']

def data_set(socket, data):
    tree_key = socket.node.id_data.name
    socket_key = socket.node.name, socket.index

    if not tree_key in data_cache:
        data_cache[tree_key] = {}

    data_cache[tree_key][socket_key] = data

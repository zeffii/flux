import collections
from contextlib import contextmanager


def fx_update(node, context):
    tree = node.id_data
    graph = tree.get_dependency_graph()
    tree.evaluate_graph(graph, from_node=node)


def make_update_list_from_graph(ng, graph, from_node=None):

    # make_update_list(node_tree, dependencies=None):
    node_set = set(ng.nodes.keys())

    # node_tree is one node..
    if len(node_set) == 1: return list(node_set)
    if len(node_set) == 0: return []

    name = node_set.pop()
    node_set.add(name)
    node_count = len(node_set)

    tree_stack = collections.deque([name])
    tree_stack_append = tree_stack.append
    tree_stack_pop = tree_stack.pop

    out = collections.OrderedDict()

    # travel in node graph create one sorted list of nodes based on dependencies
    while node_count > len(out):

        node_dependencies = True

        for dep_name in graph[name]:
            if dep_name in node_set and dep_name not in out:
                tree_stack_append(name)
                name = dep_name
                node_dependencies = False
                break

        if len(tree_stack) > node_count:
            error("Invalid node tree!")
            return []

        # if all dependencies are in out
        if node_dependencies:
            if name not in out:
                out[name] = 1
            if tree_stack:
                name = tree_stack_pop()
            else:
                if node_count == len(out):
                    break
                for node_name in node_set:
                    if node_name not in out:
                        name = node_name
                        break

    final_list = list(out.keys())
    if from_node:
        final_list = final_list[final_list.index(from_node.name):]

    return final_list 


def evaluate_graph(ng, graph, from_node=None):

    """
    the goal of this function is to perform evaluation on all nodes in the given graph.
    the graph can be a subset of nodes, or the whole tree. 

    "graph" is expected to be an iterable of nodes, likely generated by "make_dependency_graph"

    """

    graph_processing_health = "healthy"

    update_list = make_update_list_from_graph(ng, graph, from_node)

    for node_name in graph:

        node = ng.nodes[node_name]

        if node.bl_idname == 'NodeReroute':
            # this dot node has no evaluate function
            continue

        if graph_processing_health == "healthy":


            try:
                node.evaluate()
                node.status = "finished evaluation"
            except Exception as err:
                print(node.name, err)
                node.status = "failed evaluation"
                graph_processing_health = "halted"

        else:
            node.status = "unprocessed"


def make_dependency_graph(ng):

    """
    lifted from sverchok, with major decapitations
    """

    deps = collections.defaultdict(set)

    for i, link in enumerate(list(ng.links)):
        #  this proctects against a rare occurance where
        #  a link is considered valid without a to_socket
        #  or a from_socket. proctects against a blender crash
        #  see https://github.com/nortikin/sverchok/issues/493
        if not (link.to_socket and link.from_socket):
            ng.links.remove(link)
            raise ValueError("Invalid link found!, please report this file")

        if not link.is_valid:
            return collections.defaultdict(set)  # this happens more often than one might think

        if link.is_hidden:
            continue

        key, value = (link.to_node.name, link.from_node.name)
        deps[key].add(value)

    return deps


def freeze_node_tree(ng):
    ...
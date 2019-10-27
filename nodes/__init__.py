import flux

from flux.nodes.tests import test_node
from flux.nodes.other_tests import test_node_2, test_node_3

modules = test_node, test_node_2, test_node_3


def register():
    for node_file in modules:
        node_file.register()


def unregister():
    for node_file in reversed(modules):
        node_file.unregister()
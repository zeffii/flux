import inspect
import flux

from flux.nodes.tests import test_node
from flux.nodes.other_tests import test_node_2, test_node_3


def make_modules():
    modules = []
    append_modules = modules.append

    def append_modules_func(node_modules):
        for item in node_modules:
            if hasattr(item[1], 'register'):
                append_modules(item[1])

    append_modules_func(inspect.getmembers(tests, inspect.ismodule))
    append_modules_func(inspect.getmembers(other_tests, inspect.ismodule))
    return modules

modules = make_modules()


def register():
    for node_file in modules:
        node_file.register()


def unregister():
    for node_file in reversed(modules):
        node_file.unregister()
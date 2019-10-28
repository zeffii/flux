import inspect
import importlib
import os
from os.path import dirname
from os.path import basename
from collections import defaultdict

import flux
from flux import nodes
# from flux.nodes.tests import test_node
# from flux.nodes.other_tests import test_node_2, test_node_3

directory = dirname(__file__)
nodes_dict = defaultdict(list)

def automatic_collection():
    for subdir, dirs, files in os.walk(directory):
        current_dir = basename(subdir)
        if current_dir == '__pycache__':
            continue
        for file in files:
            if file == '__init__.py':
                continue
            if not file.endswith('.py'):
                continue
            nodes_dict[current_dir].append(file[:-3])

    return nodes_dict

automatic_collection()

def make_node_list(nodes):
    node_list = []
    base_name = "flux.nodes"
    for category, names in nodes.nodes_dict.items():
        importlib.import_module(f'.{category}', base_name)
        import_modules(names, f'{base_name}.{category}', node_list)
    return node_list


def import_modules(modules, base, im_list):
    for m in modules:
        im = importlib.import_module('.{}'.format(m), base)
        im_list.append(im)

node_list = make_node_list(nodes)


def register():
    for node_file in node_list:
        node_file.register()

def unregister():
    for node_file in reversed(node_list):
        node_file.unregister()
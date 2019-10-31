import bpy
from bpy.types import NodeTree, Node

from flux.core.update_system import evaluate_graph, make_dependency_graph

class FluxCustomTree(NodeTree):
    '''A custom node tree type that will show up in the editor type list'''
    bl_label = "F l u x"
    bl_icon = 'LIGHTPROBE_GRID'

    def evaluate_graph(self):
        #
        #
        #
        #
        ...

    def make_dependency_graph(self):
        #
        #
        #
        #
        ...

# Mix-in class for all custom nodes in this tree type.
# Defines a poll function to enable instantiation.
class FluxCustomTreeNode(Node):
    @classmethod
    def poll(cls, ntree):
        return ntree.bl_idname == 'FluxCustomTree'



classes = [FluxCustomTree]
register, unregister = bpy.utils.register_classes_factory(classes)
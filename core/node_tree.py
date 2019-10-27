import bpy
from bpy.types import NodeTree, Node


class FluxCustomTree(NodeTree):
    '''A custom node tree type that will show up in the editor type list'''
    bl_label = "Flux Node Tree"
    bl_icon = 'NODETREE'


# Mix-in class for all custom nodes in this tree type.
# Defines a poll function to enable instantiation.
class FluxCustomTreeNode(Node):
    @classmethod
    def poll(cls, ntree):
        return ntree.bl_idname == 'FluxCustomTree'



classes = [FluxCustomTree]
register, unregister = bpy.utils.register_classes_factory(classes)
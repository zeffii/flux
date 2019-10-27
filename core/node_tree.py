import bpy
from bpy.types import NodeTree, Node

# Implementation of custom nodes from Python


# Derived from the NodeTree base type, similar to Menu, Operator, Panel, etc.
class FluxCustomTree(NodeTree):
    # Description string
    '''A custom node tree type that will show up in the editor type list'''
    bl_label = "Flux Node Tree"
    bl_icon = 'NODETREE'


# Mix-in class for all custom nodes in this tree type.
# Defines a poll function to enable instantiation.
class FluxCustomTreeNode:
    @classmethod
    def poll(cls, ntree):
        return ntree.bl_idname == 'FluxCustomTree'


# Derived from the Node base type.
class FluxTestNode(Node, FluxCustomTreeNode):
    bl_label = "Custom Node"
    bl_icon = 'SOUND'

    my_string_prop: bpy.props.StringProperty()
    my_float_prop: bpy.props.FloatProperty(default=3.1415926)

    def init(self, context):
        self.inputs.new('FluxSocketGeneric', "Hello")
        self.inputs.new('NodeSocketFloat', "World")
        self.inputs.new('NodeSocketVector', "!")

        self.outputs.new('NodeSocketColor', "How")
        self.outputs.new('NodeSocketColor', "are")
        self.outputs.new('NodeSocketFloat', "you")

    # Copy function to initialize a copied node from an existing one.
    def copy(self, node):
        print("Copying from node ", node)

    # Free function to clean up on removal.
    def free(self):
        print("Removing node ", self, ", Goodbye!")

    # Additional buttons displayed on the node.
    def draw_buttons(self, context, layout):
        layout.label(text="Node settings")
        layout.prop(self, "my_float_prop")

    # Detail buttons in the sidebar.
    # If this function is not defined, the draw_buttons function is used instead
    def draw_buttons_ext(self, context, layout):
        layout.prop(self, "my_float_prop")
        # my_string_prop button will only be visible in the sidebar
        layout.prop(self, "my_string_prop")

    def draw_label(self):
        return "I am a custom node"


### Node Categories ###
# Node categories are a python system for automatically
# extending the Add menu, toolbar panels and search operator.
# For more examples see release/scripts/startup/nodeitems_builtins.py

import nodeitems_utils
from nodeitems_utils import NodeCategory, NodeItem

# our own base class with an appropriate poll function,
# so the categories only show up in our own tree type


class FluxNodeCategory(NodeCategory):
    @classmethod
    def poll(cls, context):
        return context.space_data.tree_type == 'FluxCustomTree'


# all categories in a list
node_categories = [
    # identifier, label, items list
    FluxNodeCategory('SOMENODES', "Some Nodes", items=[
        NodeItem("FluxTestNode"),
    ]),
    FluxNodeCategory('OTHERNODES', "Other Nodes", items=[
        NodeItem("FluxTestNode", label="Node A", settings={
            "my_string_prop": repr("Lorem ipsum dolor sit amet"),
            "my_float_prop": repr(1.0),
        }),
        NodeItem("FluxTestNode", label="Node B", settings={
            "my_string_prop": repr("consectetur adipisicing elit"),
            "my_float_prop": repr(2.0),
        }),
    ]),
]

classes = (FluxCustomTree, FluxTestNode)


def register():
    from bpy.utils import register_class

    for cls in classes:
        register_class(cls)
    nodeitems_utils.register_node_categories('CUSTOM_NODES', node_categories)


def unregister():
    from bpy.utils import unregister_class

    nodeitems_utils.unregister_node_categories('CUSTOM_NODES')
    for cls in reversed(classes):
        unregister_class(cls)

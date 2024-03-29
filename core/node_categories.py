
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
    FluxNodeCategory('GENERATORS', "generators", items=[
        NodeItem("FluxCircleNode")]),
    FluxNodeCategory('DEBUG', "Debug info", items=[
        NodeItem("FluxDebugPrint")]),
    FluxNodeCategory('OTHERNODES', "Other Nodes", items=[
        NodeItem("FluxTestNode"),
        NodeItem("FluxTestNode2", label="Node A", settings={
            "my_string_prop": repr("Lorem ipsum dolor sit amet"),
            "my_float_prop": repr(1.0),
        }),
        NodeItem("FluxTestNode3", label="Node B", settings={
            "my_string_prop": repr("consectetur adipisicing elit"),
            "my_float_prop": repr(2.0),
        }),
    ]),
]


def register():
    nodeitems_utils.register_node_categories('CUSTOM_NODES', node_categories)


def unregister():
    nodeitems_utils.unregister_node_categories('CUSTOM_NODES')

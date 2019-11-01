import bpy
from bpy.types import NodeTree, Node

from flux.core.update_system import evaluate_graph, make_dependency_graph, freeze_node_tree


def fx_update(node, context):
    graph = node.id_data.make_dependency_graph()
    node.id_data.evaluate_graph(graph)


class FluxCustomTree(NodeTree):
    '''A custom node tree type that will show up in the editor type list'''
    bl_label = "F l u x"
    bl_icon = 'LIGHTPROBE_GRID'

    has_changed = bpy.props.BoolProperty(default=False)
    is_frozen = bpy.props.BoolProperty(default=False)

    def update(self):
        if self.is_frozen:
            self.has_changed = False
            return

        self.has_changed = True
        fx_update(self, None)

    def evaluate_graph(self, graph):
        evaluate_graph(self, graph)
        self.has_changed = False

    def make_dependency_graph(self):
        return make_dependency_graph(self)


class FluxCustomTreeNode(Node):
    @classmethod
    def poll(cls, ntree):
        return ntree.bl_idname == 'FluxCustomTree'

    def copy(self, node):
        if hasattr(self, 'fx_copy'):
            print(f'calling fx copy on {node}')
            self.fx_copy(node)

    def free(self):
        if hasattr(self, 'fx_free'):
            print(f'calling fx free on {node}')
            self.fx_free(node)

    def init(self, context):

        ng = self.id_data
        with freeze_node_tree(ng) as frozen:
            if hasattr(self, 'fx_init'):
                self.fx_init(context)

        # because by default nothing is connected to a new node, there is no need
        # to start building a depsgraph or evaluating it.

        # nodes can trigger nodetree update if they want



classes = [FluxCustomTree]
register, unregister = bpy.utils.register_classes_factory(classes)
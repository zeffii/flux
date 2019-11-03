import bpy
from bpy.types import NodeTree, Node

from flux.core.update_system import evaluate_graph, make_dependency_graph
from flux.core.flux_cache import graph_cache

def fx_update(node, context):
    tree = node.id_data
    graph = tree.get_dependency_graph()
    tree.evaluate_graph(graph, from_node=node)


class FluxCustomTree(NodeTree):
    '''A custom node tree type that will show up in the editor type list'''
    bl_label = "F l u x"
    bl_icon = 'LIGHTPROBE_GRID'

    has_changed: bpy.props.BoolProperty(default=False)
    is_frozen: bpy.props.BoolProperty(default=False)

    def freeze(self):
        self.is_frozen = True

    def unfreeze(self):
        self.is_frozen = False

    def update(self):
        if self.is_frozen:
            self.has_changed = False
            return

        self.has_changed = True
        graph = self.make_dependency_graph()
        self.evaluate_graph(graph)

    def evaluate_graph(self, graph, from_node=None):
        evaluate_graph(self, graph, from_node)
        self.has_changed = False

    def make_dependency_graph(self):
        graph = make_dependency_graph(self)
        graph_cache[self] = graph
        return graph

    def get_dependency_graph(self):
        if not self in graph_cache:
            graph_cache[self] = self.make_dependency_graph()
        return graph_cache[self]

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

    def fx_init(self, context):
        print(self, "has no fx_init function")

    def evaluate(self):
        print(f"{self.name} has no evaluate function..")

    def init(self, context):

        # because by default nothing is connected to a new node, there is no need
        # to start building a depsgraph or evaluating it.
        # --- nodes can trigger nodetree update if they want

        self.id_data.freeze()

        try:
            self.fx_init(context)
        except Exception as err:
            print(f'fx_init of {self.name} failed:', err)
        
        self.id_data.unfreeze()


classes = [FluxCustomTree]
register, unregister = bpy.utils.register_classes_factory(classes)
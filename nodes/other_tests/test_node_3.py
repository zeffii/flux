import bpy
from flux.core.node_tree import FluxCustomTreeNode

class FluxTestNode3(FluxCustomTreeNode):
    bl_label = "Custom Node 3"
    bl_icon = 'SOUND'

    my_string_prop: bpy.props.StringProperty()
    my_float_prop: bpy.props.FloatProperty(default=3.1415926)

    def fx_init(self, context):
        self.inputs.new('FluxSocketGeneric', "Hello")
        self.outputs.new('NodeSocketColor', "How")

    def draw_buttons(self, context, layout):
        layout.label(text="Node settings")
        layout.prop(self, "my_float_prop")

    def draw_buttons_ext(self, context, layout):
        layout.prop(self, "my_float_prop")
        layout.prop(self, "my_string_prop")

    def draw_label(self):
        return "I am a custom node"


register, unregister = bpy.utils.register_classes_factory([FluxTestNode3])
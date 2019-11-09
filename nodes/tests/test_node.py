import bpy

from flux.core.node_tree import FluxCustomTreeNode, fx_update, throttle_tree_update

class FluxTestNode(FluxCustomTreeNode):
    bl_label = "Custom Node"
    bl_icon = 'SOUND'

    my_string_prop: bpy.props.StringProperty()
    my_float_prop: bpy.props.FloatProperty(default=3.1415926)

    def wrapped_update(self, context):
        with throttle_tree_update(self):
            self.inputs.new('FluxSocketGeneric', "!")
            self.inputs.new('FluxSocketGeneric', "2")


    mode_options = [(k, k, '', i) for i, k in enumerate(["A", "B"])]
    
    selected_mode = bpy.props.EnumProperty(
        items=mode_options,
        description="offers....",
        default="A", update=wrapped_update)

    def fx_init(self, context):
        self.inputs.new('FluxSocketGeneric', "Hello")
        self.inputs.new('NodeSocketFloat', "World")

        self.outputs.new('NodeSocketColor', "How")
        self.outputs.new('NodeSocketColor', "are")
        self.outputs.new('NodeSocketFloat', "you")

    def fx_copy(self, node):
        print("---- opying from node ", node)

    def fx_free(self):
        print("---- Removing node ", self, ", Goodbye!")

    def draw_buttons(self, context, layout):
        layout.label(text="Node settings--")
        layout.prop(self, "my_float_prop")
        layout.prop(self, "selected_mode", expand=True)

    def draw_buttons_ext(self, context, layout):
        layout.prop(self, "my_float_prop")
        layout.prop(self, "my_string_prop")

    def draw_label(self):
        return "I am a custom node"


register, unregister = bpy.utils.register_classes_factory([FluxTestNode])
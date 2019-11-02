import bpy
from bpy.types import NodeSocket

class FluxSocketCommon(NodeSocket):

    # Optional function for drawing the socket input value
    def draw(self, context, layout, node, text):
        if self.is_output or self.is_linked:
            layout.label(text=text)
        else:
            if self.prop_name:
                layout.prop(node, self.prop_name, text=text)
            else:
                layout.label(text=text)


class FluxSocketGeneric(FluxSocketCommon):
    bl_label = "Generic Socket"

    draw_socket: bpy.props.StringProperty()
    prop_name: bpy.props.StringProperty()

    def draw_color(self, context, node):
        return (0.9, 0.3, 0.7, 1.0)


class FluxSocketVector(FluxSocketCommon):
    bl_label = "Vector Socket"

    draw_socket: bpy.props.StringProperty()
    prop_name: bpy.props.StringProperty()

    def draw_color(self, context, node):
        return (0.9, 0.5, 0.2, 1.0)


class FluxSocketNumber(FluxSocketCommon):
    bl_label = "Number Socket"

    draw_socket: bpy.props.StringProperty()
    prop_name: bpy.props.StringProperty()

    def draw_color(self, context, node):
        return (0.5, 0.8, 0.9, 1.0)


classes = [FluxSocketGeneric, FluxSocketVector, FluxSocketNumber]
register, unregister = bpy.utils.register_classes_factory(classes)        
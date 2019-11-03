import bpy
from bpy.types import NodeSocket

class FluxSocketCommon(NodeSocket):

    # Optional function for drawing the socket input value
    def draw(self, context, layout, node, text):
        if self.is_output or self.is_linked:
            layout.label(text=text)
        else:
            if self.prop_name:
                display_text = text if self.display_prop_name else ""
                layout.prop(node, self.prop_name, text=display_text)
            else:
                layout.label(text=text)

    def draw_color(self, context, node):
        return self.fx_draw_color


class FluxSocketGeneric(FluxSocketCommon):
    bl_label = "Generic Socket"
    fx_draw_color = (0.9, 0.3, 0.7, 1.0)

    draw_socket: bpy.props.StringProperty()
    prop_name: bpy.props.StringProperty()
    display_prop_name: bpy.props.BoolProperty(default=True)


class FluxSocketVector(FluxSocketCommon):
    bl_label = "Vector Socket"
    fx_draw_color = (0.9, 0.5, 0.2, 1.0)

    draw_socket: bpy.props.StringProperty()
    prop_name: bpy.props.StringProperty()
    display_prop_name: bpy.props.BoolProperty(default=False)


class FluxSocketNumber(FluxSocketCommon):
    bl_label = "Number Socket"
    fx_draw_color = (0.5, 0.8, 0.9, 1.0)

    draw_socket: bpy.props.StringProperty()
    prop_name: bpy.props.StringProperty()
    display_prop_name: bpy.props.BoolProperty(default=True)



classes = [FluxSocketGeneric, FluxSocketVector, FluxSocketNumber]
register, unregister = bpy.utils.register_classes_factory(classes)        
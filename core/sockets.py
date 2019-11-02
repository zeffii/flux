import bpy
from bpy.types import NodeSocket

class FluxSocketGeneric(NodeSocket):
    '''Custom node socket type'''
    bl_label = "Custom Node Socket"

    draw_socket: bpy.props.StringProperty()
    prop_name: bpy.props.StringProperty()

    # Optional function for drawing the socket input value
    def draw(self, context, layout, node, text):
        if self.is_output or self.is_linked:
            layout.label(text=text)
        else:
            if self.prop_name:
                layout.prop(node, self.prop_name, text=text)
            else:
                layout.label(text=text)

    # Socket color
    def draw_color(self, context, node):
        return (1.0, 0.4, 0.216, 0.5)


classes = [FluxSocketGeneric]
register, unregister = bpy.utils.register_classes_factory(classes)        
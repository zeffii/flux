import bpy
from bpy.types import NodeSocket

from flux.core.flux_cache import data_get, data_set

class FluxSocketCommon:

    __annotations__ = {}
    __annotations__['draw_socket'] = bpy.props.StringProperty()
    __annotations__['prop_name'] = bpy.props.StringProperty()

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

    @property
    def index(self):
        node = self.node
        sockets = node.outputs if self.is_output else node.inputs
        for i, s in enumerate(sockets):
            if s == self:
                return i

    @property
    def socket_id(self):
        return str(hash(self.id_data.name + self.node.name + self.identifier))

    @property
    def other_has_upstream_node(self):
        ...

    def get_other_socket(socket):
        """
        Get next real upstream socket.
        This should be expanded to support wifi nodes also.
        Will return None if there isn't a another socket connect
        so no need to check socket.links
        """
        if not socket.is_linked:
            return None
        if not socket.is_output:
            other = socket.links[0].from_socket
        else:
            other = socket.links[0].to_socket

        if other.node.bl_idname == 'NodeReroute':
            if not socket.is_output:
                return get_other_socket(other.node.inputs[0])
            else:
                return get_other_socket(other.node.outputs[0])
        else:  #other.node.bl_idname == 'WifiInputNode':
            return other
            

    def data_get(self, fallback=None):
        if self.is_linked and self.other_has_upstream_node:
            return data_get(self)
        return fallback or getattr(self.node, self.prop_name)

    def data_set(self, data):
        data_set(self, data)

class FluxSocketGeneric(NodeSocket, FluxSocketCommon):
    bl_label = "Generic Socket"
    fx_draw_color = (0.9, 0.3, 0.7, 1.0)

    display_prop_name: bpy.props.BoolProperty(default=True)


class FluxSocketVector(NodeSocket, FluxSocketCommon):
    bl_label = "Vector Socket"
    fx_draw_color = (0.9, 0.5, 0.2, 1.0)

    display_prop_name: bpy.props.BoolProperty(default=False)


class FluxSocketNumber(NodeSocket, FluxSocketCommon):
    bl_label = "Number Socket"
    fx_draw_color = (0.5, 0.8, 0.9, 1.0)

    display_prop_name: bpy.props.BoolProperty(default=True)



classes = [FluxSocketGeneric, FluxSocketVector, FluxSocketNumber]
register, unregister = bpy.utils.register_classes_factory(classes)        
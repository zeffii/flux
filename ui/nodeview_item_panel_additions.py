import bpy


def context_poll(context):
    return context.space_data.tree_type in {'FluxCustomTree'} and context.active_node

def flux_node_info_draw(self, context):
    if not context_poll(context):
        return

    node = context.active_node
    layout = self.layout
    bl_idname = node.bl_idname
    row = layout.row()
    row.enabled = False
    row.prop(node, "bl_idname")  # add copy operator on this row
    layout.label(text=node.__module__.replace('flux.nodes.', '').replace('.', ' \\ '))


def register():
    # bpy.utils.register_class(ClassName)
    bpy.types.NODE_PT_active_node_generic.append(flux_node_info_draw)


def unregister():
    # bpy.utils.unregister_class(ClassName)
    bpy.types.NODE_PT_active_node_generic.remove(flux_node_info_draw)
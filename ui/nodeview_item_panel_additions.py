import bpy


def context_poll(context):
    return context.space_data.tree_type in {'FluxCustomTree'} and context.active_node

def draw_copy_idname(row, node):
    col1 = row.column()
    col1.label(text="ID name")
    col2 = row.column()
    col2.enabled = False
    col2.prop(node, "bl_idname", text="")  # add copy operator on this row
    op2 = col2.operator("node.copy_text_to_clipboard", text="", icon="TEXT")
    op2.string_to_copy = node.bl_idname


def flux_node_info_draw(self, context):
    if not context_poll(context):
        return

    node = context.active_node
    layout = self.layout

    row = layout.row(align=True)
    draw_copy_idname(row, node)

    layout.label(text=node.__module__.replace('flux.nodes.', '').replace('.', ' \\ '))


def register():
    # bpy.utils.register_class(ClassName)
    bpy.types.NODE_PT_active_node_generic.append(flux_node_info_draw)


def unregister():
    # bpy.utils.unregister_class(ClassName)
    bpy.types.NODE_PT_active_node_generic.remove(flux_node_info_draw)
import bpy


class FluxCopyTextToClipboard(bpy.types.Operator):

    bl_idname = "node.copy_text_to_clipboard"
    bl_label = "copy text to clipboard"

    string_to_copy: bpy.props.StringProperty()

    def execute(self, context):
        str_lines = self.string_to_copy
        bpy.context.window_manager.clipboard = str_lines
        return {'FINISHED'}


classes = [FluxCopyTextToClipboard]
register, unregister = bpy.utils.register_classes_factory(classes)
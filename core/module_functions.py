def register_modules(modules):
    import bpy

    def register():
        for module in modules:
            module.register()

    def unregister():
        for module in reversed(modules):
            module.unregister()

    return register, unregister